import assert from "node:assert/strict";
import test from "node:test";

import {
  extractedFontMetadata,
  resolveFontExtractionPages,
  sortExtractedFontNames,
  trueTypeGlyphCount,
} from "../lib/pdf/extract-fonts-options.ts";
import { buildResourceExtractionArguments } from "../lib/pdf/extract-images-options.ts";

test("font extraction ranges resolve to sorted one-based pages", () => {
  assert.deepEqual(resolveFontExtractionPages("3,1-2,2", 4), [1, 2, 3]);
  assert.deepEqual(resolveFontExtractionPages("", 2), [1, 2]);
});

test("font extraction rejects invalid and oversized selections", () => {
  assert.throws(() => resolveFontExtractionPages("0", 2), /out of range/);
  assert.throws(
    () => resolveFontExtractionPages("", 101),
    /Extract fonts from at most 100 pages/,
  );
});

test("pdfcpu font arguments select TrueType extraction in offline mode", () => {
  assert.deepEqual(buildResourceExtractionArguments("font", [2, 1, 2]), [
    "pdfcpu",
    "extract",
    "--mode",
    "font",
    "--conf",
    "disable",
    "--offline",
    "--pages",
    "1,2",
    "/input.pdf",
    "/fonts",
  ]);
});

test("font filenames are sanitised and subset prefixes are identified", () => {
  assert.deepEqual(extractedFontMetadata("../input_1_ABCDEF+Inter.ttf"), {
    name: "input_1_ABCDEF+Inter.ttf",
    mimeType: "font/ttf",
    subset: true,
  });
  assert.deepEqual(extractedFontMetadata("TimesNewRoman.ttf"), {
    name: "TimesNewRoman.ttf",
    mimeType: "font/ttf",
    subset: false,
  });
});

test("small TrueType glyph sets are conservatively flagged as likely subsets", () => {
  const font = new Uint8Array(34);
  const view = new DataView(font.buffer);
  view.setUint16(4, 1);
  font.set([0x6d, 0x61, 0x78, 0x70], 12);
  view.setUint32(20, 28);
  view.setUint16(32, 91);

  assert.equal(trueTypeGlyphCount(font), 91);
  assert.equal(extractedFontMetadata("input_ArialMT.ttf", font).subset, true);
  view.setUint16(32, 1_024);
  assert.equal(extractedFontMetadata("FullFont.ttf", font).subset, false);
});

test("malformed font table offsets do not escape the input", () => {
  const font = new Uint8Array(28);
  const view = new DataView(font.buffer);
  view.setUint16(4, 1);
  font.set([0x6d, 0x61, 0x78, 0x70], 12);
  view.setUint32(20, 10_000);
  assert.equal(trueTypeGlyphCount(font), null);
});

test("font filenames sort naturally", () => {
  assert.deepEqual(
    sortExtractedFontNames(["font_10.ttf", "font_2.ttf", "font_1.ttf"]),
    ["font_1.ttf", "font_2.ttf", "font_10.ttf"],
  );
});
