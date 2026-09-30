import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateCropRect,
  createImageEditPlan,
  formatSupportsQuality,
  imageEditFileName,
} from "../lib/image-editor/edit.ts";

test("original crop preserves every source pixel", () => {
  assert.deepEqual(calculateCropRect(1600, 900, "original"), {
    x: 0,
    y: 0,
    width: 1600,
    height: 900,
  });
});

test("square crop uses the full short edge and centres by default", () => {
  assert.deepEqual(calculateCropRect(1600, 900, "1:1"), {
    x: 350,
    y: 0,
    width: 900,
    height: 900,
  });
});

test("portrait sources crop vertically for landscape presets", () => {
  assert.deepEqual(calculateCropRect(900, 1600, "16:9"), {
    x: 0,
    y: 547,
    width: 900,
    height: 506,
  });
});

test("focal positions move a crop across all available space", () => {
  assert.deepEqual(calculateCropRect(1600, 900, "1:1", 0, 0.5).x, 0);
  assert.deepEqual(calculateCropRect(1600, 900, "1:1", 1, 0.5).x, 700);
  assert.deepEqual(calculateCropRect(900, 1600, "1:1", 0.5, 0).y, 0);
  assert.deepEqual(calculateCropRect(900, 1600, "1:1", 0.5, 1).y, 700);
});

test("focal positions clamp to the image boundaries", () => {
  assert.equal(calculateCropRect(1600, 900, "1:1", -2, 0.5).x, 0);
  assert.equal(calculateCropRect(1600, 900, "1:1", 3, 0.5).x, 700);
});

test("resize plans preserve the selected crop aspect ratio", () => {
  assert.deepEqual(
    createImageEditPlan(4000, 3000, {
      cropPreset: "16:9",
      focalX: 0.5,
      focalY: 0.5,
      outputWidth: 1920,
    }),
    {
      crop: { x: 0, y: 375, width: 4000, height: 2250 },
      outputWidth: 1920,
      outputHeight: 1080,
    },
  );
});

test("resize plans reject unsafe or invalid dimensions", () => {
  assert.throws(
    () =>
      createImageEditPlan(100, 100, {
        cropPreset: "original",
        focalX: 0.5,
        focalY: 0.5,
        outputWidth: 0,
      }),
    /Output width must be/,
  );
  assert.throws(
    () =>
      createImageEditPlan(16000, 16000, {
        cropPreset: "original",
        focalX: 0.5,
        focalY: 0.5,
        outputWidth: 16000,
      }),
    /40 megapixels/,
  );
});

test("output filenames replace familiar image extensions", () => {
  assert.equal(
    imageEditFileName("photo.JPEG", "image/webp"),
    "photo-edited.webp",
  );
  assert.equal(imageEditFileName("asset", "image/avif"), "asset-edited.avif");
  assert.equal(imageEditFileName(".png", "image/jpeg"), "image-edited.jpg");
});

test("PNG is lossless while compressed formats expose quality", () => {
  assert.equal(formatSupportsQuality("image/png"), false);
  assert.equal(formatSupportsQuality("image/jpeg"), true);
  assert.equal(formatSupportsQuality("image/webp"), true);
  assert.equal(formatSupportsQuality("image/avif"), true);
});

test("non-finite focal points are rejected", () => {
  assert.throws(
    () => calculateCropRect(100, 100, "1:1", Number.NaN, 0.5),
    /Crop position must be finite/,
  );
});
