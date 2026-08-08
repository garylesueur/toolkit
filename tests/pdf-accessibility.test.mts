import assert from "node:assert/strict";
import test from "node:test";

import { PDFDocument, PDFName, PDFNumber, PDFString } from "pdf-lib";

import {
  analysePdfAccessibility,
  summariseAccessibilityFindings,
} from "../lib/pdf/accessibility.ts";
import type { AccessibilityFinding } from "../lib/pdf/accessibility.ts";

function byId(
  report: Awaited<ReturnType<typeof analysePdfAccessibility>>,
  id: string,
) {
  return report.findings.find((item) => item.id === id);
}

async function taggedDocument(options?: {
  alt?: string | null;
  pages?: number;
  withFigure?: boolean;
}) {
  const pdf = await PDFDocument.create();
  const pageCount = options?.pages ?? 1;
  for (let index = 0; index < pageCount; index++) {
    const page = pdf.addPage([300, 400]);
    page.node.set(PDFName.of("StructParents"), PDFNumber.of(index));
  }
  pdf.setTitle("Accessible sample");
  pdf.catalog.set(PDFName.of("Lang"), PDFString.of("en-GB"));
  pdf.catalog.set(PDFName.of("MarkInfo"), pdf.context.obj({ Marked: true }));
  pdf.catalog.getOrCreateViewerPreferences().setDisplayDocTitle(true);

  const element = pdf.context.obj(
    options?.withFigure
      ? {
          S: "Figure",
          K: 0,
          ...(options.alt === null
            ? {}
            : { Alt: PDFString.of(options.alt ?? "A useful chart") }),
        }
      : { S: "P", K: 0 },
  );
  const elementRef = pdf.context.register(element);
  pdf.catalog.set(
    PDFName.of("StructTreeRoot"),
    pdf.context.obj({ Type: "StructTreeRoot", K: [elementRef] }),
  );
  return pdf;
}

test("empty input is rejected", async () => {
  await assert.rejects(analysePdfAccessibility(new Uint8Array()), /non-empty/);
});

test("an untagged PDF reports structural blockers without claiming conformance", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage([100, 100]);
  const report = await analysePdfAccessibility(await pdf.save());

  assert.equal(byId(report, "structure-tree")?.status, "error");
  assert.equal(byId(report, "marked-content")?.status, "error");
  assert.equal(byId(report, "document-language")?.status, "warning");
  assert.match(report.scope, /not a PDF\/UA/);
  assert.equal(report.facts.tagged, false);
});

test("a consistently tagged document passes every automatic core check", async () => {
  const pdf = await taggedDocument();
  const report = await analysePdfAccessibility(await pdf.save());

  assert.equal(report.summary.error, 0);
  assert.equal(report.summary.warning, 0);
  assert.equal(report.summary.manual, 3);
  assert.equal(report.facts.tagged, true);
  assert.equal(report.facts.structuredElements, 1);
  assert.equal(byId(report, "page-structure-parent")?.status, "pass");
});

test("an empty structure tree is detected", async () => {
  const pdf = await taggedDocument();
  pdf.catalog.set(
    PDFName.of("StructTreeRoot"),
    pdf.context.obj({ Type: "StructTreeRoot", K: [] }),
  );
  const report = await analysePdfAccessibility(await pdf.save());
  assert.equal(byId(report, "structure-content")?.status, "error");
});

test("tagged figures require Alt or ActualText", async () => {
  const missing = await taggedDocument({ withFigure: true, alt: null });
  const missingReport = await analysePdfAccessibility(await missing.save());
  assert.equal(byId(missingReport, "figure-alternatives")?.status, "error");

  const described = await taggedDocument({ withFigure: true });
  const describedReport = await analysePdfAccessibility(await described.save());
  assert.equal(byId(describedReport, "figure-alternatives")?.status, "pass");
  assert.equal(describedReport.facts.figures, 1);
});

test("tagged pages must link back to the structure tree", async () => {
  const pdf = await taggedDocument({ pages: 2 });
  pdf.getPage(1).node.delete(PDFName.of("StructParents"));
  const report = await analysePdfAccessibility(await pdf.save());
  assert.equal(byId(report, "page-structure-parent")?.status, "error");
  assert.match(
    byId(report, "page-structure-parent")?.detail ?? "",
    /1 of 2 pages/,
  );
});

test("form fields are checked for alternate field names", async () => {
  const missing = await taggedDocument();
  missing.getForm().createTextField("email").addToPage(missing.getPage(0));
  const missingReport = await analysePdfAccessibility(await missing.save());
  assert.equal(byId(missingReport, "form-tooltips")?.status, "error");

  const labelled = await taggedDocument();
  const field = labelled.getForm().createTextField("email");
  field.acroField.dict.set(PDFName.of("TU"), PDFString.of("Email address"));
  field.addToPage(labelled.getPage(0));
  const labelledReport = await analysePdfAccessibility(await labelled.save());
  assert.equal(byId(labelledReport, "form-tooltips")?.status, "pass");
  assert.equal(labelledReport.facts.formFields, 1);
});

test("link annotation descriptions are reported", async () => {
  const pdf = await taggedDocument();
  pdf
    .getPage(0)
    .node.set(PDFName.of("Annots"), pdf.context.obj([{ Subtype: "Link" }]));
  const report = await analysePdfAccessibility(await pdf.save());
  assert.equal(byId(report, "link-descriptions")?.status, "warning");
  assert.equal(report.facts.linkAnnotations, 1);
});

test("finding summaries count each status", () => {
  const findings = [
    { id: "a", title: "A", status: "pass", detail: "" },
    { id: "b", title: "B", status: "error", detail: "" },
    { id: "c", title: "C", status: "warning", detail: "" },
    { id: "d", title: "D", status: "manual", detail: "" },
    { id: "e", title: "E", status: "pass", detail: "" },
  ] satisfies AccessibilityFinding[];
  assert.deepEqual(summariseAccessibilityFindings(findings), {
    error: 1,
    warning: 1,
    pass: 2,
    manual: 1,
  });
});
