import assert from "node:assert/strict";
import test from "node:test";

import { PDFArray, PDFDict, PDFDocument, PDFName, PDFString } from "pdf-lib";

import {
  cleanPdfActiveContent,
  inspectPdfActiveContent,
} from "../lib/pdf/active-content.ts";

async function fixture(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([320, 480]);
  const javascript = pdf.context.obj({
    S: PDFName.of("JavaScript"),
    JS: PDFString.of("app.alert('hello')"),
  });
  const uri = pdf.context.obj({
    S: PDFName.of("URI"),
    URI: PDFString.of("https://example.com/track"),
  });
  const internal = pdf.context.obj({
    S: PDFName.of("GoTo"),
    D: pdf.context.obj([page.ref, PDFName.of("Fit")]),
  });
  const media = pdf.context.obj({ S: PDFName.of("Rendition") });
  const scriptLink = pdf.context.register(
    pdf.context.obj({ Type: "Annot", Subtype: "Link", A: javascript }),
  );
  const externalLink = pdf.context.register(
    pdf.context.obj({ Type: "Annot", Subtype: "Link", A: uri }),
  );
  const internalLink = pdf.context.register(
    pdf.context.obj({ Type: "Annot", Subtype: "Link", A: internal }),
  );
  const richMedia = pdf.context.register(
    pdf.context.obj({ Type: "Annot", Subtype: "RichMedia", A: media }),
  );
  const fileSpec = pdf.context.register(
    pdf.context.obj({
      Type: "Filespec",
      F: PDFString.of("payload.bin"),
      EF: { F: pdf.context.stream(Uint8Array.of(1, 2, 3)) },
    }),
  );
  const attachment = pdf.context.register(
    pdf.context.obj({
      Type: "Annot",
      Subtype: "FileAttachment",
      FS: fileSpec,
    }),
  );
  page.node.set(
    PDFName.of("Annots"),
    pdf.context.obj([
      scriptLink,
      externalLink,
      internalLink,
      richMedia,
      attachment,
    ]),
  );
  page.node.set(PDFName.of("AA"), pdf.context.obj({ O: javascript }));
  pdf.catalog.set(PDFName.of("OpenAction"), javascript);
  pdf.catalog.set(PDFName.of("AF"), pdf.context.obj([fileSpec]));
  pdf.catalog.set(
    PDFName.of("Names"),
    pdf.context.obj({
      JavaScript: { Names: [PDFString.of("script"), javascript] },
      EmbeddedFiles: { Names: [PDFString.of("payload.bin"), fileSpec] },
    }),
  );
  const form = pdf.context.obj({ XFA: PDFString.of("<xfa/>") });
  pdf.catalog.set(PDFName.of("AcroForm"), form);
  return pdf.save({ useObjectStreams: false });
}

test("active content inspection classifies structural signals", async () => {
  const report = await inspectPdfActiveContent(await fixture());
  assert.equal(report.pageCount, 1);
  assert.ok(report.counts["automatic-actions"] >= 3);
  assert.ok(report.counts["external-actions"] >= 1);
  assert.ok(report.counts["embedded-files"] >= 3);
  assert.ok(report.counts["interactive-media"] >= 1);
  assert.equal(report.counts.xfa, 1);
  assert.equal(
    report.total,
    Object.values(report.counts).reduce((sum, count) => sum + count, 0),
  );
});

test("cleaning every category verifies that active content is gone", async () => {
  const result = await cleanPdfActiveContent(await fixture(), [
    "automatic-actions",
    "external-actions",
    "embedded-files",
    "interactive-media",
    "xfa",
  ]);
  assert.equal(result.after.total, 0);
  assert.ok(Object.values(result.removed).every((count) => count > 0));
  assert.equal((await PDFDocument.load(result.bytes)).getPageCount(), 1);
});

test("external cleaning preserves internal GoTo link actions", async () => {
  const result = await cleanPdfActiveContent(await fixture(), [
    "external-actions",
  ]);
  const pdf = await PDFDocument.load(result.bytes);
  const annotations = pdf
    .getPage(0)
    .node.lookupMaybe(PDFName.of("Annots"), PDFArray)!;
  const actionTypes: string[] = [];
  for (let index = 0; index < annotations.size(); index += 1) {
    const annotation = annotations.lookupMaybe(index, PDFDict);
    const action = annotation?.lookupMaybe(PDFName.of("A"), PDFDict);
    const type = action?.lookupMaybe(PDFName.of("S"), PDFName)?.decodeText();
    if (type) actionTypes.push(type);
  }
  assert.ok(actionTypes.includes("GoTo"));
  assert.ok(!actionTypes.includes("URI"));
  assert.ok(actionTypes.includes("JavaScript"));
});

test("script cleaning preserves ordinary external links", async () => {
  const result = await cleanPdfActiveContent(await fixture(), [
    "automatic-actions",
  ]);
  assert.ok(result.after.counts["external-actions"] > 0);
  assert.equal(result.after.counts["automatic-actions"], 0);
});

test("embedded-file cleaning removes name trees, associations, and attachment annotations", async () => {
  const result = await cleanPdfActiveContent(await fixture(), [
    "embedded-files",
  ]);
  assert.equal(result.after.counts["embedded-files"], 0);
  assert.ok(result.after.counts["interactive-media"] > 0);
});

test("cleaning requires a valid non-empty selection", async () => {
  await assert.rejects(
    cleanPdfActiveContent(await fixture(), []),
    /Select at least one/,
  );
  await assert.rejects(
    cleanPdfActiveContent(await fixture(), ["bogus" as never]),
    /selection is invalid/,
  );
});

test("cleaning rejects a selection with no matching content", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  await assert.rejects(
    cleanPdfActiveContent(await pdf.save(), ["xfa"]),
    /No selected active content/,
  );
});

test("inspection rejects an empty input", async () => {
  await assert.rejects(
    inspectPdfActiveContent(new Uint8Array()),
    /non-empty PDF/,
  );
});
