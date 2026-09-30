import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFRef,
  PDFString,
  decodePDFRawStream,
} from "pdf-lib";

export type PdfAttachment = {
  bytes: Uint8Array;
  description: string | null;
  id: string;
  mimeType: string | null;
  name: string;
  size: number;
};

type AttachmentEntry = PdfAttachment & {
  fileSpecRef?: PDFRef;
  streamRef?: PDFRef;
};

function textValue(value: unknown): string | null {
  return value instanceof PDFString || value instanceof PDFHexString
    ? value.decodeText()
    : null;
}

function visitNameTree(
  node: PDFDict,
  pdf: PDFDocument,
  entries: AttachmentEntry[],
) {
  const names = node.lookupMaybe(PDFName.of("Names"), PDFArray);
  if (names) {
    for (let index = 0; index + 1 < names.size(); index += 2) {
      const treeName = textValue(names.lookup(index));
      const fileSpecObject = names.get(index + 1);
      const fileSpec = pdf.context.lookupMaybe(fileSpecObject, PDFDict);
      if (!fileSpec) continue;
      const embeddedFiles = fileSpec.lookupMaybe(PDFName.of("EF"), PDFDict);
      if (!embeddedFiles) continue;
      const streamObject =
        embeddedFiles.get(PDFName.of("UF")) ??
        embeddedFiles.get(PDFName.of("F"));
      const streamObjectValue = pdf.context.lookup(streamObject);
      if (!(streamObjectValue instanceof PDFRawStream)) continue;
      const stream = streamObjectValue;
      const params = stream.dict.lookupMaybe(PDFName.of("Params"), PDFDict);
      const declaredSize = params
        ?.lookupMaybe(PDFName.of("Size"), PDFNumber)
        ?.asNumber();
      const bytes = decodePDFRawStream(stream).decode();
      const name =
        textValue(fileSpec.lookup(PDFName.of("UF"))) ??
        textValue(fileSpec.lookup(PDFName.of("F"))) ??
        treeName ??
        `attachment-${entries.length + 1}`;
      entries.push({
        bytes,
        description: textValue(fileSpec.lookup(PDFName.of("Desc"))),
        fileSpecRef:
          fileSpecObject instanceof PDFRef ? fileSpecObject : undefined,
        id: String(entries.length),
        mimeType:
          stream.dict
            .lookupMaybe(PDFName.of("Subtype"), PDFName)
            ?.decodeText() ?? null,
        name,
        size: declaredSize ?? bytes.length,
        streamRef: streamObject instanceof PDFRef ? streamObject : undefined,
      });
    }
  }
  const kids = node.lookupMaybe(PDFName.of("Kids"), PDFArray);
  if (!kids) return;
  for (let index = 0; index < kids.size(); index++) {
    const child = kids.lookupMaybe(index, PDFDict);
    if (child) visitNameTree(child, pdf, entries);
  }
}

function collectEntries(pdf: PDFDocument): AttachmentEntry[] {
  const names = pdf.catalog.lookupMaybe(PDFName.of("Names"), PDFDict);
  const embeddedFiles = names?.lookupMaybe(
    PDFName.of("EmbeddedFiles"),
    PDFDict,
  );
  const entries: AttachmentEntry[] = [];
  if (embeddedFiles) visitNameTree(embeddedFiles, pdf, entries);
  return entries;
}

export async function inspectPdfAttachments(
  source: Uint8Array,
): Promise<PdfAttachment[]> {
  const pdf = await PDFDocument.load(source);
  return collectEntries(pdf).map(
    ({ fileSpecRef: _fileSpecRef, streamRef: _streamRef, ...entry }) => entry,
  );
}

function removeRefsFromArray(array: PDFArray, refs: Set<string>) {
  for (let index = array.size() - 1; index >= 0; index--) {
    if (refs.has(array.get(index).toString())) array.remove(index);
  }
}

function removeFromNameTree(node: PDFDict, selectedRefs: Set<string>) {
  const names = node.lookupMaybe(PDFName.of("Names"), PDFArray);
  if (names) {
    for (let index = names.size() - 2; index >= 0; index -= 2) {
      if (selectedRefs.has(names.get(index + 1).toString())) {
        names.remove(index + 1);
        names.remove(index);
      }
    }
  }
  const kids = node.lookupMaybe(PDFName.of("Kids"), PDFArray);
  if (!kids) return;
  for (let index = 0; index < kids.size(); index++) {
    const child = kids.lookupMaybe(index, PDFDict);
    if (child) removeFromNameTree(child, selectedRefs);
  }
}

export async function removePdfAttachments(
  source: Uint8Array,
  attachmentIds: string[],
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(source);
  const entries = collectEntries(pdf);
  const selected = new Set(attachmentIds);
  const targets = entries.filter((entry) => selected.has(entry.id));
  if (targets.length === 0) throw new Error("Select at least one attachment.");
  const fileSpecRefs = new Set(
    targets.flatMap((entry) =>
      entry.fileSpecRef ? [entry.fileSpecRef.toString()] : [],
    ),
  );
  const names = pdf.catalog.lookupMaybe(PDFName.of("Names"), PDFDict);
  const embeddedFiles = names?.lookupMaybe(
    PDFName.of("EmbeddedFiles"),
    PDFDict,
  );
  if (embeddedFiles) removeFromNameTree(embeddedFiles, fileSpecRefs);
  const associatedFiles = pdf.catalog.lookupMaybe(PDFName.of("AF"), PDFArray);
  if (associatedFiles) removeRefsFromArray(associatedFiles, fileSpecRefs);
  for (const target of targets) {
    if (target.streamRef) pdf.context.delete(target.streamRef);
    if (target.fileSpecRef) pdf.context.delete(target.fileSpecRef);
  }
  pdf.setProducer("Toolkit — toolkit.lesueur.uk");
  return pdf.save({ useObjectStreams: true });
}
