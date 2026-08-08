import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFObject,
  PDFRef,
  PDFStream,
} from "pdf-lib";

export const MAX_ACTIVE_CONTENT_PAGES = 1_000;
export const MAX_ACTIVE_CONTENT_OBJECTS = 50_000;

export const PDF_ACTIVE_CONTENT_CATEGORIES = [
  {
    id: "automatic-actions",
    label: "Scripts and automatic actions",
    description:
      "Document JavaScript, open actions, additional-action triggers, and chained actions.",
  },
  {
    id: "external-actions",
    label: "External and launch actions",
    description:
      "Links or actions that can open a URL, launch a file, submit a form, import data, or open another PDF.",
  },
  {
    id: "embedded-files",
    label: "Embedded and associated files",
    description:
      "Embedded-file name trees, associated-file references, and file-attachment annotations.",
  },
  {
    id: "interactive-media",
    label: "Interactive media",
    description:
      "Rich media, video, sound, screen, and 3D annotations or actions.",
  },
  {
    id: "xfa",
    label: "XFA form content",
    description:
      "XML Forms Architecture content. Ordinary AcroForm fields are preserved.",
  },
] as const;

export type PdfActiveContentCategory =
  (typeof PDF_ACTIVE_CONTENT_CATEGORIES)[number]["id"];

export type PdfActiveContentFinding = {
  category: PdfActiveContentCategory;
  detail: string;
  kind: string;
};

export type PdfActiveContentInspection = {
  counts: Record<PdfActiveContentCategory, number>;
  findings: PdfActiveContentFinding[];
  objectCount: number;
  pageCount: number;
  total: number;
};

export type CleanPdfActiveContentResult = {
  after: PdfActiveContentInspection;
  before: PdfActiveContentInspection;
  bytes: Uint8Array;
  removed: Record<PdfActiveContentCategory, number>;
};

const EXTERNAL_ACTIONS = new Set([
  "GoToR",
  "ImportData",
  "Launch",
  "SubmitForm",
  "URI",
]);
const MEDIA_ACTIONS = new Set(["GoTo3DView", "Movie", "Rendition", "Sound"]);
const MEDIA_ANNOTATIONS = new Set([
  "3D",
  "Movie",
  "RichMedia",
  "Screen",
  "Sound",
]);

function nameValue(dict: PDFDict, key: string): string | null {
  return (
    dict.lookupMaybe(PDFName.of(key), PDFName)?.asString().replace(/^\//, "") ??
    null
  );
}

function dereference(
  pdf: PDFDocument,
  object: PDFObject,
): PDFObject | undefined {
  return object instanceof PDFRef ? pdf.context.lookup(object) : object;
}

function collectDictionaries(pdf: PDFDocument): PDFDict[] {
  const dictionaries: PDFDict[] = [];
  const seen = new WeakSet<object>();
  let visited = 0;

  const visit = (input: PDFObject | undefined): void => {
    if (!input) return;
    const object = dereference(pdf, input);
    if (!object) return;
    if (seen.has(object)) return;
    seen.add(object);
    visited += 1;
    if (visited > MAX_ACTIVE_CONTENT_OBJECTS) {
      throw new Error(
        `Inspect PDFs with at most ${MAX_ACTIVE_CONTENT_OBJECTS.toLocaleString("en")} reachable objects at a time.`,
      );
    }
    if (object instanceof PDFStream) {
      visit(object.dict);
      return;
    }
    if (object instanceof PDFDict) {
      dictionaries.push(object);
      for (const value of object.values()) visit(value);
      return;
    }
    if (object instanceof PDFArray) {
      for (const value of object.asArray()) visit(value);
    }
  };

  visit(pdf.catalog);
  for (const [, object] of pdf.context.enumerateIndirectObjects())
    visit(object);
  return dictionaries;
}

function emptyCounts(): Record<PdfActiveContentCategory, number> {
  return {
    "automatic-actions": 0,
    "external-actions": 0,
    "embedded-files": 0,
    "interactive-media": 0,
    "xfa": 0,
  };
}

function actionCategory(action: PDFDict): PdfActiveContentCategory | null {
  const type = nameValue(action, "S");
  if (type === "JavaScript") return "automatic-actions";
  if (type && EXTERNAL_ACTIONS.has(type)) return "external-actions";
  if (type && MEDIA_ACTIONS.has(type)) return "interactive-media";
  return null;
}

function inspectLoadedPdf(pdf: PDFDocument): PdfActiveContentInspection {
  const pageCount = pdf.getPageCount();
  if (pageCount > MAX_ACTIVE_CONTENT_PAGES) {
    throw new Error(
      `Inspect PDFs with at most ${MAX_ACTIVE_CONTENT_PAGES.toLocaleString("en")} pages at a time.`,
    );
  }
  const dictionaries = collectDictionaries(pdf);
  const findings: PdfActiveContentFinding[] = [];
  const add = (
    category: PdfActiveContentCategory,
    kind: string,
    detail: string,
  ) => findings.push({ category, detail, kind });

  const names = pdf.catalog.lookupMaybe(PDFName.of("Names"), PDFDict);
  if (names?.has(PDFName.of("JavaScript"))) {
    add(
      "automatic-actions",
      "Document JavaScript",
      "The document name tree contains JavaScript.",
    );
  }
  if (pdf.catalog.has(PDFName.of("OpenAction"))) {
    add(
      "automatic-actions",
      "Open action",
      "An action or destination is configured to run when the PDF opens.",
    );
  }
  if (names?.has(PDFName.of("EmbeddedFiles"))) {
    add(
      "embedded-files",
      "Embedded-file name tree",
      "The document catalogue exposes embedded files.",
    );
  }
  const acroForm = pdf.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict);
  if (acroForm?.has(PDFName.of("XFA"))) {
    add(
      "xfa",
      "XFA form content",
      "The AcroForm dictionary contains XFA data.",
    );
  }

  for (const dict of dictionaries) {
    if (dict.has(PDFName.of("AA"))) {
      add(
        "automatic-actions",
        "Additional actions",
        "A document, page, field, or annotation has event-triggered actions.",
      );
    }
    if (dict.has(PDFName.of("Next")) && nameValue(dict, "S")) {
      add(
        "automatic-actions",
        "Chained action",
        "An action can trigger one or more follow-up actions.",
      );
    }
    const category = actionCategory(dict);
    if (category) {
      const type = nameValue(dict, "S") ?? "Unknown";
      add(
        category,
        `${type} action`,
        `The PDF contains a ${type} action dictionary.`,
      );
    }
    if (nameValue(dict, "Type") === "Filespec" && dict.has(PDFName.of("EF"))) {
      add(
        "embedded-files",
        "Embedded file specification",
        "A file specification points to embedded file data.",
      );
    }
    if (dict.has(PDFName.of("AF"))) {
      add(
        "embedded-files",
        "Associated files",
        "A PDF object carries associated-file references.",
      );
    }
    const subtype = nameValue(dict, "Subtype");
    if (subtype === "FileAttachment") {
      add(
        "embedded-files",
        "File attachment annotation",
        "A page contains a visible file-attachment annotation.",
      );
    }
    if (subtype && MEDIA_ANNOTATIONS.has(subtype)) {
      add(
        "interactive-media",
        `${subtype} annotation`,
        `A page or form contains an interactive ${subtype} annotation.`,
      );
    }
  }

  const counts = emptyCounts();
  for (const finding of findings) counts[finding.category] += 1;
  return {
    counts,
    findings,
    objectCount: dictionaries.length,
    pageCount,
    total: findings.length,
  };
}

export async function inspectPdfActiveContent(
  source: Uint8Array,
): Promise<PdfActiveContentInspection> {
  if (!source.byteLength) throw new Error("Choose a non-empty PDF first.");
  const pdf = await PDFDocument.load(source, { updateMetadata: false });
  return inspectLoadedPdf(pdf);
}

function removeAnnotationsBySubtype(
  pdf: PDFDocument,
  subtypes: ReadonlySet<string>,
): void {
  for (const page of pdf.getPages()) {
    const annotations = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
    if (!annotations) continue;
    for (let index = annotations.size() - 1; index >= 0; index -= 1) {
      const raw = annotations.get(index);
      const annotation = annotations.lookupMaybe(index, PDFDict);
      const subtype = annotation ? nameValue(annotation, "Subtype") : null;
      if (!subtype || !subtypes.has(subtype)) continue;
      annotations.remove(index);
      if (raw instanceof PDFRef) pdf.context.delete(raw);
    }
    if (annotations.size() === 0) page.node.delete(PDFName.of("Annots"));
  }
}

export async function cleanPdfActiveContent(
  source: Uint8Array,
  categories: PdfActiveContentCategory[],
): Promise<CleanPdfActiveContentResult> {
  if (!source.byteLength) throw new Error("Choose a non-empty PDF first.");
  const selected = new Set(categories);
  if (!selected.size) throw new Error("Select at least one content category.");
  if (
    [...selected].some(
      (category) =>
        !PDF_ACTIVE_CONTENT_CATEGORIES.some((item) => item.id === category),
    )
  ) {
    throw new Error("The active-content selection is invalid.");
  }

  const pdf = await PDFDocument.load(source, { updateMetadata: false });
  const before = inspectLoadedPdf(pdf);
  if ([...selected].every((category) => before.counts[category] === 0)) {
    throw new Error("No selected active content was found in this PDF.");
  }

  const dictionaries = collectDictionaries(pdf);
  const names = pdf.catalog.lookupMaybe(PDFName.of("Names"), PDFDict);
  if (selected.has("automatic-actions")) {
    pdf.catalog.delete(PDFName.of("OpenAction"));
    names?.delete(PDFName.of("JavaScript"));
    for (const dict of dictionaries) {
      dict.delete(PDFName.of("AA"));
      dict.delete(PDFName.of("Next"));
      if (actionCategory(dict) === "automatic-actions") {
        dict.delete(PDFName.of("S"));
        dict.delete(PDFName.of("JS"));
      }
    }
  }
  if (selected.has("external-actions")) {
    for (const dict of dictionaries) {
      if (actionCategory(dict) === "external-actions") {
        dict.delete(PDFName.of("S"));
        dict.delete(PDFName.of("URI"));
        dict.delete(PDFName.of("F"));
        dict.delete(PDFName.of("Win"));
        dict.delete(PDFName.of("Mac"));
        dict.delete(PDFName.of("Unix"));
      }
    }
  }
  if (selected.has("embedded-files")) {
    names?.delete(PDFName.of("EmbeddedFiles"));
    for (const dict of dictionaries) {
      dict.delete(PDFName.of("AF"));
      if (nameValue(dict, "Type") === "Filespec") {
        dict.delete(PDFName.of("EF"));
      }
    }
    removeAnnotationsBySubtype(pdf, new Set(["FileAttachment"]));
  }
  if (selected.has("interactive-media")) {
    for (const dict of dictionaries) {
      if (actionCategory(dict) === "interactive-media") {
        dict.delete(PDFName.of("S"));
        dict.delete(PDFName.of("R"));
        dict.delete(PDFName.of("TA"));
      }
    }
    removeAnnotationsBySubtype(pdf, MEDIA_ANNOTATIONS);
  }
  if (selected.has("xfa")) {
    for (const dict of dictionaries) {
      if (dict.has(PDFName.of("XFA"))) dict.delete(PDFName.of("XFA"));
    }
  }

  pdf.setProducer("Toolkit — toolkit.lesueur.uk");
  const bytes = await pdf.save({ useObjectStreams: true });
  const after = await inspectPdfActiveContent(bytes);
  for (const category of selected) {
    if (after.counts[category] !== 0) {
      throw new Error(
        `Verification found remaining ${PDF_ACTIVE_CONTENT_CATEGORIES.find((item) => item.id === category)?.label.toLowerCase() ?? "active content"}.`,
      );
    }
  }
  const removed = emptyCounts();
  for (const category of selected) {
    removed[category] = before.counts[category] - after.counts[category];
  }
  return { after, before, bytes, removed };
}
