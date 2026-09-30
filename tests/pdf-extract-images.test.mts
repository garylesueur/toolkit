import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_IMAGE_EXTRACTION_PAGES,
  buildImageExtractionArguments,
  extractedImageMetadata,
  resolveImageExtractionPages,
  sortExtractedImageNames,
} from "../lib/pdf/extract-images-options.ts";

test("an empty image range selects every one-based page", () => {
  assert.deepEqual(resolveImageExtractionPages("", 3), [1, 2, 3]);
});

test("image ranges are validated, sorted, and deduplicated", () => {
  assert.deepEqual(resolveImageExtractionPages("3, 1-2, 2", 4), [1, 2, 3]);
  assert.throws(() => resolveImageExtractionPages("0", 3), /out of range/);
});

test("image extraction enforces its page safety bound", () => {
  assert.throws(
    () => resolveImageExtractionPages("", MAX_IMAGE_EXTRACTION_PAGES + 1),
    /at most 100 pages/,
  );
});

test("pdfcpu image arguments stay offline and include selected pages", () => {
  assert.deepEqual(buildImageExtractionArguments([3, 1, 3]), [
    "pdfcpu",
    "images",
    "extract",
    "--conf",
    "disable",
    "--offline",
    "--pages",
    "1,3",
    "/input.pdf",
    "/images",
  ]);
});

test("invalid worker page selections are rejected", () => {
  assert.throws(() => buildImageExtractionArguments([]), /at least one/);
  assert.throws(() => buildImageExtractionArguments([1, 1.5]), /invalid/);
});

test("extracted image names are sanitised and assigned MIME types", () => {
  assert.deepEqual(extractedImageMetadata("../scan:1.JPG"), {
    name: "scan_1.JPG",
    mimeType: "image/jpeg",
    previewable: true,
  });
  assert.deepEqual(extractedImageMetadata("mask.jbig2"), {
    name: "mask.jbig2",
    mimeType: "image/x-jbig2",
    previewable: false,
  });
});

test("unknown extracted formats remain downloadable but are not previewed", () => {
  assert.deepEqual(extractedImageMetadata("raw.bin"), {
    name: "raw.bin",
    mimeType: "application/octet-stream",
    previewable: false,
  });
});

test("extracted image filenames sort naturally", () => {
  assert.deepEqual(
    sortExtractedImageNames(["page_10.png", "page_2.png", "page_1.png"]),
    ["page_1.png", "page_2.png", "page_10.png"],
  );
});
