import assert from "node:assert/strict";
import test from "node:test";

import { PDFDocument } from "pdf-lib";

import {
  calculateCropBox,
  cropPageIndices,
  cropPreviewInsets,
} from "../lib/pdf/crop-options.ts";
import { cropPdf } from "../lib/pdf/crop.ts";

test("crop margins map correctly from visual edges to PDF coordinates", () => {
  assert.deepEqual(
    calculateCropBox(
      { x: 10, y: 20, width: 600, height: 800 },
      { top: 30, right: 40, bottom: 50, left: 60 },
    ),
    {
      x: 70,
      y: 70,
      width: 500,
      height: 720,
    },
  );
});

test("crop validation rejects negative, non-finite, and page-erasing margins", () => {
  const box = { x: 0, y: 0, width: 100, height: 100 };
  assert.throws(
    () => calculateCropBox(box, { top: -1, right: 0, bottom: 0, left: 0 }),
    /Top margin/,
  );
  assert.throws(
    () =>
      calculateCropBox(box, { top: 0, right: Number.NaN, bottom: 0, left: 0 }),
    /Right margin/,
  );
  assert.throws(
    () => calculateCropBox(box, { top: 50, right: 0, bottom: 50, left: 0 }),
    /entire visible page/,
  );
});

test("crop page ranges default to all and validate explicit choices", () => {
  assert.deepEqual(cropPageIndices([], 3), [0, 1, 2]);
  assert.deepEqual(cropPageIndices([2, 0, 2], 4), [0, 2]);
  assert.throws(() => cropPageIndices([], 0), /no pages/);
  assert.throws(() => cropPageIndices([3], 3), /between 1 and 3/);
});

test("preview insets convert points into bounded percentages", () => {
  assert.deepEqual(
    cropPreviewInsets(
      { x: 0, y: 0, width: 200, height: 400 },
      { top: 40, right: 20, bottom: 80, left: 10 },
    ),
    {
      top: "10%",
      right: "10%",
      bottom: "20%",
      left: "5%",
    },
  );
  assert.equal(
    cropPreviewInsets(
      { x: 0, y: 0, width: 100, height: 100 },
      { top: 200, right: 0, bottom: 0, left: 0 },
    ).top,
    "100%",
  );
});

test("the PDF transform crops only selected pages", async () => {
  const source = await PDFDocument.create();
  source.addPage([600, 800]);
  source.addPage([500, 700]);
  const output = await cropPdf(
    await source.save(),
    { top: 20, right: 30, bottom: 40, left: 50 },
    [1],
  );
  const result = await PDFDocument.load(output);
  assert.deepEqual(result.getPage(0).getCropBox(), {
    x: 0,
    y: 0,
    width: 600,
    height: 800,
  });
  assert.deepEqual(result.getPage(1).getCropBox(), {
    x: 50,
    y: 40,
    width: 420,
    height: 640,
  });
});
