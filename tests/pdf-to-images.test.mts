import assert from "node:assert/strict";
import test from "node:test";

import { parsePageRanges } from "../lib/pdf/page-ranges.ts";
import {
  imageExtension,
  imageMimeType,
  outputImageName,
  pdfBaseName,
  resolvePageNumbers,
  validateCanvasSize,
} from "../lib/pdf/to-images-options.ts";

test("an empty range means all pages", () => {
  assert.deepEqual(parsePageRanges("", 8), { pages: [], error: null });
  assert.deepEqual(parsePageRanges("   ", 8), { pages: [], error: null });
});

test("ranges become sorted, zero-based page indices", () => {
  assert.deepEqual(parsePageRanges("5, 1-3", 6), {
    pages: [0, 1, 2, 4],
    error: null,
  });
});

test("ranges tolerate whitespace and remove duplicates", () => {
  assert.deepEqual(parsePageRanges(" 2 - 4, 3, 2 ", 5), {
    pages: [1, 2, 3],
    error: null,
  });
});

test("ranges reject descending, zero, and overflowing pages", () => {
  assert.match(parsePageRanges("4-2", 5).error ?? "", /Invalid range/);
  assert.match(parsePageRanges("0", 5).error ?? "", /out of range/);
  assert.match(parsePageRanges("6", 5).error ?? "", /out of range/);
  assert.match(parsePageRanges("2-6", 5).error ?? "", /Invalid range/);
});

test("ranges reject malformed input", () => {
  assert.match(parsePageRanges("one", 5).error ?? "", /Cannot parse/);
  assert.match(parsePageRanges("1..3", 5).error ?? "", /Cannot parse/);
});

test("format helpers return browser MIME types and familiar extensions", () => {
  assert.equal(imageMimeType("png"), "image/png");
  assert.equal(imageMimeType("jpeg"), "image/jpeg");
  assert.equal(imageExtension("png"), "png");
  assert.equal(imageExtension("jpeg"), "jpg");
});

test("PDF base names strip only a trailing PDF extension", () => {
  assert.equal(pdfBaseName("Report.PDF"), "Report");
  assert.equal(pdfBaseName("quarter.pdf.backup"), "quarter.pdf.backup");
  assert.equal(pdfBaseName(".pdf"), "document");
});

test("output names are stable and sort naturally", () => {
  assert.equal(
    outputImageName("report.pdf", 1, 12, "png"),
    "report-page-01.png",
  );
  assert.equal(
    outputImageName("report.pdf", 12, 12, "jpeg"),
    "report-page-12.jpg",
  );
  assert.equal(outputImageName("book.pdf", 3, 250, "png"), "book-page-003.png");
});

test("an empty selection resolves to every one-based PDF page", () => {
  assert.deepEqual(resolvePageNumbers([], 4), [1, 2, 3, 4]);
});

test("selected pages are sorted, deduplicated, and made one-based", () => {
  assert.deepEqual(resolvePageNumbers([3, 0, 3, 1], 5), [1, 2, 4]);
});

test("page resolution rejects empty PDFs and invalid selections", () => {
  assert.throws(() => resolvePageNumbers([], 0), /no exportable pages/);
  assert.throws(() => resolvePageNumbers([-1], 3), /between 1 and 3/);
  assert.throws(() => resolvePageNumbers([3], 3), /between 1 and 3/);
});

test("canvas dimensions are rounded up before allocation", () => {
  assert.deepEqual(validateCanvasSize(612.1, 791.2), {
    width: 613,
    height: 792,
    pixels: 485_496,
  });
});

test("canvas validation rejects invalid and unsafe dimensions", () => {
  assert.throws(() => validateCanvasSize(0, 100), /invalid dimensions/);
  assert.throws(
    () => validateCanvasSize(Number.NaN, 100),
    /invalid dimensions/,
  );
  assert.throws(() => validateCanvasSize(10_000, 10_000), /lower resolution/);
  assert.doesNotThrow(() => validateCanvasSize(2_000, 2_000, 4_000_000));
});
