import assert from "node:assert/strict";
import test from "node:test";

import { PDFDocument, PDFName } from "pdf-lib";

import { assembleCompressedPdf } from "../lib/pdf/strong-compress-assemble.ts";
import {
  compressionSavings,
  dpiToPdfScale,
  STRONG_COMPRESSION_LOSSES,
  strongCompressionSettings,
} from "../lib/pdf/strong-compress-options.ts";

const ONE_PIXEL_JPEG = Uint8Array.from(
  Buffer.from(
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/EH//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/EH//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/EH//2Q==",
    "base64",
  ),
);

test("presets become progressively smaller", () => {
  const balanced = strongCompressionSettings("balanced");
  const smaller = strongCompressionSettings("smaller");
  const smallest = strongCompressionSettings("smallest");
  assert.ok(balanced.dpi > smaller.dpi && smaller.dpi > smallest.dpi);
  assert.ok(
    balanced.jpegQuality > smaller.jpegQuality &&
      smaller.jpegQuality > smallest.jpegQuality,
  );
});

test("unknown presets are rejected", () => {
  assert.throws(
    () => strongCompressionSettings("huge" as never),
    /supported compression preset/,
  );
});

test("DPI converts to PDF.js scale", () => {
  assert.equal(dpiToPdfScale(72), 1);
  assert.equal(dpiToPdfScale(144), 2);
  assert.equal(dpiToPdfScale(90), 1.25);
});

test("unsafe resolutions are rejected", () => {
  assert.throws(() => dpiToPdfScale(35), /36 to 300 DPI/);
  assert.throws(() => dpiToPdfScale(301), /36 to 300 DPI/);
  assert.throws(() => dpiToPdfScale(Number.NaN), /36 to 300 DPI/);
});

test("smaller output reports exact savings", () => {
  assert.deepEqual(compressionSavings(10_000, 6_001), {
    savedSize: 3_999,
    savedPercent: 40,
    useOriginal: false,
  });
});

test("larger output keeps the original", () => {
  assert.deepEqual(compressionSavings(1_000, 1_000), {
    savedSize: 0,
    savedPercent: 0,
    useOriginal: true,
  });
  assert.equal(compressionSavings(1_000, 1_500).useOriginal, true);
});

test("invalid sizes are rejected", () => {
  assert.throws(() => compressionSavings(-1, 2), /non-negative/);
  assert.throws(() => compressionSavings(1, Number.NaN), /non-negative/);
});

test("the flattening warning enumerates major feature losses", () => {
  assert.deepEqual(STRONG_COMPRESSION_LOSSES, [
    "selectable text and search",
    "links and bookmarks",
    "forms, signatures, and annotations",
    "layers and accessibility structure",
  ]);
});

test("compressed JPEG pages retain physical page sizes", async () => {
  const bytes = await assembleCompressedPdf([
    { jpegBytes: ONE_PIXEL_JPEG, pageWidth: 612, pageHeight: 792 },
    { jpegBytes: ONE_PIXEL_JPEG, pageWidth: 792, pageHeight: 612 },
  ]);
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(), 2);
  assert.deepEqual(pdf.getPage(0).getSize(), { width: 612, height: 792 });
  assert.deepEqual(pdf.getPage(1).getSize(), { width: 792, height: 612 });
  for (const page of pdf.getPages()) {
    assert.ok(page.node.get(PDFName.of("Contents")));
    assert.ok(page.node.get(PDFName.of("Resources")));
  }
});

test("assembly rejects empty documents and invalid pages", async () => {
  await assert.rejects(assembleCompressedPdf([]), /no pages/);
  await assert.rejects(
    assembleCompressedPdf([
      { jpegBytes: ONE_PIXEL_JPEG, pageWidth: 0, pageHeight: 100 },
    ]),
    /invalid dimensions/,
  );
  await assert.rejects(
    assembleCompressedPdf([
      { jpegBytes: new Uint8Array(), pageWidth: 100, pageHeight: 100 },
    ]),
    /image is empty/,
  );
});
