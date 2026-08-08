import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFRef,
  PDFString,
} from "pdf-lib";

import { parsePageRanges } from "./page-ranges.ts";

export const MAX_ANNOTATION_PAGES = 500;
export const MAX_PDF_ANNOTATIONS = 2_000;

export const PDF_ANNOTATION_GROUPS = [
  {
    id: "comments",
    label: "Comments and text notes",
    description: "Sticky notes, free-text comments, and their pop-up windows.",
    subtypes: ["Text", "FreeText", "Popup"],
  },
  {
    id: "text-markup",
    label: "Highlights and text markup",
    description: "Highlights, underlines, squiggles, and strikeouts.",
    subtypes: ["Highlight", "Underline", "Squiggly", "StrikeOut"],
  },
  {
    id: "drawings",
    label: "Drawings and shapes",
    description: "Ink, lines, rectangles, circles, polygons, and polylines.",
    subtypes: ["Ink", "Line", "Square", "Circle", "Polygon", "PolyLine"],
  },
  {
    id: "stamps",
    label: "Stamps and carets",
    description: "Rubber-stamp annotations and text insertion carets.",
    subtypes: ["Stamp", "Caret"],
  },
  {
    id: "redactions",
    label: "Redaction annotations",
    description:
      "Redaction marks only. Removing them can reveal the original content underneath.",
    subtypes: ["Redact"],
  },
] as const;

export type PdfAnnotationGroupId = (typeof PDF_ANNOTATION_GROUPS)[number]["id"];

export type PdfRemovableAnnotation = {
  author: string | null;
  contents: string | null;
  group: PdfAnnotationGroupId;
  id: string;
  pageNumber: number;
  subtype: string;
};

export type PdfAnnotationInspection = {
  pageCount: number;
  removable: PdfRemovableAnnotation[];
  preserved: {
    formWidgets: number;
    links: number;
    other: number;
  };
  total: number;
};

export type RemovePdfAnnotationsResult = {
  bytes: Uint8Array;
  removed: number;
};

export function resolveAnnotationPages(
  value: string,
  pageCount: number,
): number[] {
  const parsed = parsePageRanges(value, pageCount);
  if (parsed.error) throw new Error(parsed.error);
  return parsed.pages.length
    ? parsed.pages.map((pageIndex) => pageIndex + 1)
    : Array.from({ length: pageCount }, (_, index) => index + 1);
}

const GROUP_BY_SUBTYPE = new Map<string, PdfAnnotationGroupId>(
  PDF_ANNOTATION_GROUPS.flatMap((group) =>
    group.subtypes.map((subtype) => [subtype, group.id] as const),
  ),
);

function textValue(dict: PDFDict, key: string): string | null {
  const value = dict.lookupMaybe(PDFName.of(key), PDFString, PDFHexString);
  const text = Array.from(value?.decodeText() ?? "", (character) => {
    const code = character.charCodeAt(0);
    return (code < 32 && code !== 9 && code !== 10 && code !== 13) ||
      code === 127
      ? "�"
      : character;
  })
    .join("")
    .trim();
  return text ? text.slice(0, 240) : null;
}

function subtypeValue(annotation: PDFDict): string {
  return (
    annotation
      .lookupMaybe(PDFName.of("Subtype"), PDFName)
      ?.asString()
      .replace(/^\//, "") ?? "Unknown"
  );
}

function assertInspectable(pdf: PDFDocument): void {
  if (pdf.getPageCount() > MAX_ANNOTATION_PAGES) {
    throw new Error(
      `Inspect PDFs with at most ${MAX_ANNOTATION_PAGES} pages at a time.`,
    );
  }
}

function collectAnnotations(pdf: PDFDocument): PdfAnnotationInspection {
  assertInspectable(pdf);
  const removable: PdfRemovableAnnotation[] = [];
  const preserved = { formWidgets: 0, links: 0, other: 0 };
  let total = 0;

  for (const [pageIndex, page] of pdf.getPages().entries()) {
    const annotations = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
    if (!annotations) continue;
    for (let index = 0; index < annotations.size(); index += 1) {
      const annotation = annotations.lookupMaybe(index, PDFDict);
      if (!annotation) continue;
      total += 1;
      if (total > MAX_PDF_ANNOTATIONS) {
        throw new Error(
          `Inspect PDFs with at most ${MAX_PDF_ANNOTATIONS.toLocaleString("en")} annotations at a time.`,
        );
      }
      const subtype = subtypeValue(annotation);
      const group = GROUP_BY_SUBTYPE.get(subtype);
      if (group) {
        removable.push({
          author: textValue(annotation, "T"),
          contents: textValue(annotation, "Contents"),
          group,
          id: `${pageIndex}:${index}`,
          pageNumber: pageIndex + 1,
          subtype,
        });
      } else if (subtype === "Link") {
        preserved.links += 1;
      } else if (subtype === "Widget") {
        preserved.formWidgets += 1;
      } else {
        preserved.other += 1;
      }
    }
  }

  return {
    pageCount: pdf.getPageCount(),
    preserved,
    removable,
    total,
  };
}

export async function inspectPdfAnnotations(
  source: Uint8Array,
): Promise<PdfAnnotationInspection> {
  if (!source.byteLength) throw new Error("Choose a non-empty PDF first.");
  const pdf = await PDFDocument.load(source, { updateMetadata: false });
  return collectAnnotations(pdf);
}

export async function removePdfAnnotations(
  source: Uint8Array,
  options: {
    groups: PdfAnnotationGroupId[];
    pages: number[];
  },
): Promise<RemovePdfAnnotationsResult> {
  if (!source.byteLength) throw new Error("Choose a non-empty PDF first.");
  const groups = new Set(options.groups);
  if (!groups.size) throw new Error("Select at least one annotation type.");
  if (
    [...groups].some(
      (group) => !PDF_ANNOTATION_GROUPS.some((item) => item.id === group),
    )
  ) {
    throw new Error("The annotation type selection is invalid.");
  }
  const pages = new Set(options.pages);
  if (
    !pages.size ||
    [...pages].some((page) => !Number.isInteger(page) || page < 1)
  ) {
    throw new Error("Select at least one valid PDF page.");
  }

  const pdf = await PDFDocument.load(source, { updateMetadata: false });
  const inspection = collectAnnotations(pdf);
  if ([...pages].some((page) => page > inspection.pageCount)) {
    throw new Error("A selected page is outside this PDF.");
  }

  let removed = 0;
  for (const [pageIndex, page] of pdf.getPages().entries()) {
    if (!pages.has(pageIndex + 1)) continue;
    const annotations = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
    if (!annotations) continue;
    for (let index = annotations.size() - 1; index >= 0; index -= 1) {
      const annotation = annotations.lookupMaybe(index, PDFDict);
      if (!annotation) continue;
      const group = GROUP_BY_SUBTYPE.get(subtypeValue(annotation));
      if (!group || !groups.has(group)) continue;
      const annotationObject = annotations.get(index);
      annotations.remove(index);
      if (annotationObject instanceof PDFRef) {
        pdf.context.delete(annotationObject);
      }
      removed += 1;
    }
    if (annotations.size() === 0) page.node.delete(PDFName.of("Annots"));
  }

  if (removed === 0) {
    throw new Error("No matching annotations were found on those pages.");
  }
  pdf.setProducer("Toolkit — toolkit.lesueur.uk");
  const beforePreserved = inspection.preserved;
  const bytes = await pdf.save({ useObjectStreams: true });
  const after = await inspectPdfAnnotations(bytes);
  if (
    after.removable.some(
      (annotation) =>
        pages.has(annotation.pageNumber) && groups.has(annotation.group),
    )
  ) {
    throw new Error("Annotation removal verification found remaining markup.");
  }
  if (
    after.preserved.links !== beforePreserved.links ||
    after.preserved.formWidgets !== beforePreserved.formWidgets ||
    after.preserved.other !== beforePreserved.other
  ) {
    throw new Error(
      "Annotation removal verification found a preserved-item mismatch.",
    );
  }
  return {
    bytes,
    removed,
  };
}
