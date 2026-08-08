import assert from "node:assert/strict";
import test from "node:test";

import { PDFDocument, PDFName, PDFString } from "pdf-lib";

import {
  inspectPdfAnnotations,
  removePdfAnnotations,
  resolveAnnotationPages,
} from "../lib/pdf/annotations.ts";

function addAnnotation(
  pdf: PDFDocument,
  pageIndex: number,
  subtype: string,
  contents: string,
  author = "QA author",
): void {
  const annotation = pdf.context.obj({
    Type: PDFName.of("Annot"),
    Subtype: PDFName.of(subtype),
    Rect: [20, 20, 120, 60],
    Contents: PDFString.of(contents),
    T: PDFString.of(author),
  });
  pdf.getPage(pageIndex).node.addAnnot(pdf.context.register(annotation));
}

async function annotatedPdf(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.addPage([300, 400]);
  pdf.addPage([300, 400]);
  addAnnotation(pdf, 0, "Text", "secret comment");
  addAnnotation(pdf, 0, "Highlight", "important highlight");
  addAnnotation(pdf, 0, "Link", "accessible link description");
  addAnnotation(pdf, 0, "Widget", "form widget");
  addAnnotation(pdf, 1, "Ink", "drawing note");
  addAnnotation(pdf, 1, "Redact", "pending redaction");
  addAnnotation(pdf, 1, "FileAttachment", "preserved attachment annotation");
  return pdf.save({ useObjectStreams: false });
}

test("annotation inspection groups removable markup and protects interactive types", async () => {
  const inspection = await inspectPdfAnnotations(await annotatedPdf());
  assert.equal(inspection.pageCount, 2);
  assert.equal(inspection.total, 7);
  assert.deepEqual(inspection.preserved, {
    formWidgets: 1,
    links: 1,
    other: 1,
  });
  assert.deepEqual(
    inspection.removable.map(({ group, pageNumber, subtype }) => ({
      group,
      pageNumber,
      subtype,
    })),
    [
      { group: "comments", pageNumber: 1, subtype: "Text" },
      { group: "text-markup", pageNumber: 1, subtype: "Highlight" },
      { group: "drawings", pageNumber: 2, subtype: "Ink" },
      { group: "redactions", pageNumber: 2, subtype: "Redact" },
    ],
  );
});

test("annotation page ranges default to all and normalise selections", () => {
  assert.deepEqual(resolveAnnotationPages("", 4), [1, 2, 3, 4]);
  assert.deepEqual(resolveAnnotationPages("4, 1-2, 2", 4), [1, 2, 4]);
  assert.throws(() => resolveAnnotationPages("0", 4), /out of range/);
});

test("inspection exposes bounded comment and author text", async () => {
  const inspection = await inspectPdfAnnotations(await annotatedPdf());
  assert.equal(inspection.removable[0].contents, "secret comment");
  assert.equal(inspection.removable[0].author, "QA author");

  const pdf = await PDFDocument.create();
  pdf.addPage();
  addAnnotation(pdf, 0, "Text", "x".repeat(500), "y".repeat(500));
  const bounded = await inspectPdfAnnotations(await pdf.save());
  assert.equal(bounded.removable[0].contents?.length, 240);
  assert.equal(bounded.removable[0].author?.length, 240);
});

test("annotation text replaces unsafe control characters before display", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  addAnnotation(pdf, 0, "Text", "before\u0014after");
  const inspection = await inspectPdfAnnotations(await pdf.save());
  assert.equal(inspection.removable[0].contents, "before�after");
});

test("comment removal preserves highlights, links, widgets, and other annotations", async () => {
  const result = await removePdfAnnotations(await annotatedPdf(), {
    groups: ["comments"],
    pages: [1, 2],
  });
  assert.equal(result.removed, 1);
  const after = await inspectPdfAnnotations(result.bytes);
  assert.deepEqual(
    after.removable.map((annotation) => annotation.subtype),
    ["Highlight", "Ink", "Redact"],
  );
  assert.deepEqual(after.preserved, {
    formWidgets: 1,
    links: 1,
    other: 1,
  });
});

test("page selection limits removal to matching pages", async () => {
  const result = await removePdfAnnotations(await annotatedPdf(), {
    groups: ["comments", "drawings"],
    pages: [2],
  });
  assert.equal(result.removed, 1);
  const after = await inspectPdfAnnotations(result.bytes);
  assert.deepEqual(
    after.removable.map(({ pageNumber, subtype }) => ({ pageNumber, subtype })),
    [
      { pageNumber: 1, subtype: "Text" },
      { pageNumber: 1, subtype: "Highlight" },
      { pageNumber: 2, subtype: "Redact" },
    ],
  );
});

test("multiple annotation groups can be removed in one rewrite", async () => {
  const result = await removePdfAnnotations(await annotatedPdf(), {
    groups: ["comments", "text-markup", "drawings", "redactions"],
    pages: [1, 2],
  });
  assert.equal(result.removed, 4);
  const after = await inspectPdfAnnotations(result.bytes);
  assert.equal(after.removable.length, 0);
  assert.equal((await PDFDocument.load(result.bytes)).getPageCount(), 2);
});

test("removed direct comment text is absent from rewritten bytes", async () => {
  const result = await removePdfAnnotations(await annotatedPdf(), {
    groups: ["comments"],
    pages: [1],
  });
  assert.equal(
    Buffer.from(result.bytes).includes(Buffer.from("secret comment")),
    false,
  );
});

test("empty, unknown, out-of-range, and unmatched selections are rejected", async () => {
  const source = await annotatedPdf();
  await assert.rejects(
    removePdfAnnotations(source, { groups: [], pages: [1] }),
    /Select at least one annotation type/,
  );
  await assert.rejects(
    removePdfAnnotations(source, {
      groups: ["unknown" as "comments"],
      pages: [1],
    }),
    /type selection is invalid/,
  );
  await assert.rejects(
    removePdfAnnotations(source, { groups: ["comments"], pages: [3] }),
    /outside this PDF/,
  );
  await assert.rejects(
    removePdfAnnotations(source, { groups: ["stamps"], pages: [1, 2] }),
    /No matching annotations/,
  );
});

test("empty PDFs and excessively long documents are bounded", async () => {
  await assert.rejects(inspectPdfAnnotations(new Uint8Array()), /non-empty/);
  const pdf = await PDFDocument.create();
  for (let index = 0; index < 501; index += 1) pdf.addPage([10, 10]);
  await assert.rejects(
    inspectPdfAnnotations(await pdf.save()),
    /at most 500 pages/,
  );
});
