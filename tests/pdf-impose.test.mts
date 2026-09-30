import assert from "node:assert/strict";
import test from "node:test";

import { PDFDocument, PDFName, StandardFonts, rgb } from "pdf-lib";

import {
  buildImpositionSheets,
  calculateImpositionGeometry,
  calculatePagePlacement,
} from "../lib/pdf/impose-options.ts";
import { imposePdf, imposedSheetSize } from "../lib/pdf/impose.ts";

async function makeNumberedPdf(pageCount: number) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let index = 0; index < pageCount; index++) {
    const page = pdf.addPage([300, 500]);
    page.drawRectangle({
      x: 0,
      y: 0,
      width: 300,
      height: 500,
      color: rgb(index / pageCount, 0.3, 0.6),
    });
    page.drawText(String(index + 1), { x: 130, y: 230, size: 48, font });
  }
  return pdf.save();
}

test("2-up sheets keep sequential page order and pad the final slot", () => {
  assert.deepEqual(buildImpositionSheets(5, "2-up"), [
    { slots: [0, 1] },
    { slots: [2, 3] },
    { slots: [4, null] },
  ]);
});

test("4-up sheets fill left-to-right and top-to-bottom", () => {
  assert.deepEqual(buildImpositionSheets(6, "4-up"), [
    { slots: [0, 1, 2, 3] },
    { slots: [4, 5, null, null] },
  ]);
});

test("eight-page booklet order pairs outside and inside pages", () => {
  assert.deepEqual(buildImpositionSheets(8, "booklet"), [
    { slots: [7, 0] },
    { slots: [1, 6] },
    { slots: [5, 2] },
    { slots: [3, 4] },
  ]);
});

test("booklets pad missing pages with blanks", () => {
  assert.deepEqual(buildImpositionSheets(5, "booklet"), [
    { slots: [null, 0] },
    { slots: [1, null] },
    { slots: [null, 2] },
    { slots: [3, 4] },
  ]);
});

test("page counts must be positive whole numbers", () => {
  assert.throws(() => buildImpositionSheets(0, "2-up"), /at least one page/);
  assert.throws(
    () => buildImpositionSheets(1.5, "booklet"),
    /at least one page/,
  );
});

test("geometry accounts for margins, gaps, rows, and columns", () => {
  assert.deepEqual(calculateImpositionGeometry(1000, 700, "4-up", 20, 10), {
    columns: 2,
    rows: 2,
    slotWidth: 475,
    slotHeight: 325,
  });
});

test("page placement fits and centres a source page without distortion", () => {
  assert.deepEqual(
    calculatePagePlacement(300, 500, 1000, 700, "2-up", 0, 20, 10),
    {
      x: 59.5,
      y: 20,
      width: 396,
      height: 660,
      scale: 1.32,
    },
  );
});

test("geometry rejects impossible spacing and invalid slots", () => {
  assert.throws(
    () => calculateImpositionGeometry(100, 100, "4-up", 50, 10),
    /leave no room/,
  );
  assert.throws(
    () => calculatePagePlacement(100, 100, 500, 500, "2-up", 2, 10, 10),
    /Slot index/,
  );
});

test("booklet output always uses landscape paper", () => {
  assert.deepEqual(
    imposedSheetSize({
      mode: "booklet",
      pageSize: "A4",
      orientation: "portrait",
      margin: 18,
      gap: 12,
    }),
    { width: 841.89, height: 595.28 },
  );
});

test("2-up transformation preserves content on the expected output pages", async () => {
  const source = await makeNumberedPdf(5);
  const progress: string[] = [];
  const bytes = await imposePdf(
    source,
    {
      mode: "2-up",
      pageSize: "A4",
      orientation: "landscape",
      margin: 18,
      gap: 12,
    },
    (completed, total) => progress.push(`${completed}/${total}`),
  );
  const output = await PDFDocument.load(bytes);
  assert.equal(output.getPageCount(), 3);
  assert.deepEqual(progress, ["1/3", "2/3", "3/3"]);
  assert.deepEqual(output.getPage(0).getSize(), {
    width: 841.89,
    height: 595.28,
  });
  for (const page of output.getPages()) {
    assert.ok(
      page.node.get(PDFName.of("Contents")),
      "output sheet should contain embedded page content",
    );
  }
});

test("booklet transformation produces four sides from five pages", async () => {
  const output = await PDFDocument.load(
    await imposePdf(await makeNumberedPdf(5), {
      mode: "booklet",
      pageSize: "Letter",
      orientation: "portrait",
      margin: 12,
      gap: 8,
    }),
  );
  assert.equal(output.getPageCount(), 4);
  assert.deepEqual(output.getPage(0).getSize(), { width: 792, height: 612 });
});

test("transform rejects spacing outside the supported range", async () => {
  await assert.rejects(
    imposePdf(await makeNumberedPdf(1), {
      mode: "2-up",
      pageSize: "A4",
      orientation: "landscape",
      margin: 145,
      gap: 8,
    }),
    /Margin must be from 0 to 144/,
  );
});
