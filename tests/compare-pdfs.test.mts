import assert from "node:assert/strict";
import test from "node:test";

import {
  comparePixels,
  comparisonSummary,
} from "../lib/pdf/compare-options.ts";

function image(width: number, height: number, pixels: number[]) {
  return { data: new Uint8ClampedArray(pixels), height, width };
}

test("identical pixels produce a zero-difference result", () => {
  const source = image(1, 1, [20, 40, 60, 255]);
  const result = comparePixels(source, source, 0);
  assert.equal(result.changedPixels, 0);
  assert.equal(result.percentChanged, 0);
  assert.equal(result.meanDelta, 0);
});

test("changed pixels are highlighted and measured", () => {
  const left = image(2, 1, [0, 0, 0, 255, 255, 255, 255, 255]);
  const right = image(2, 1, [255, 255, 255, 255, 255, 255, 255, 255]);
  const result = comparePixels(left, right, 10);
  assert.equal(result.changedPixels, 1);
  assert.equal(result.totalPixels, 2);
  assert.equal(result.percentChanged, 50);
  assert.deepEqual(
    result.data.slice(0, 4),
    new Uint8ClampedArray([236, 72, 153, 255]),
  );
});

test("threshold suppresses insignificant rendering differences", () => {
  const left = image(1, 1, [100, 100, 100, 255]);
  const right = image(1, 1, [110, 115, 105, 255]);
  assert.equal(comparePixels(left, right, 15).changedPixels, 0);
  assert.equal(comparePixels(left, right, 14).changedPixels, 1);
});

test("missing or differently sized pages compare against white", () => {
  const dark = image(1, 1, [0, 0, 0, 255]);
  const result = comparePixels(dark, null, 0);
  assert.equal(result.changedPixels, 1);
  const wider = comparePixels(
    dark,
    image(2, 1, [0, 0, 0, 255, 255, 255, 255, 255]),
    0,
  );
  assert.equal(wider.width, 2);
  assert.equal(wider.changedPixels, 0);
});

test("invalid comparison input and thresholds are rejected", () => {
  assert.throws(() => comparePixels(null, null), /At least one/);
  const source = image(1, 1, [0, 0, 0, 255]);
  assert.throws(() => comparePixels(source, source, -1), /between 0 and 255/);
  assert.throws(() => comparePixels(source, source, 256), /between 0 and 255/);
});

test("comparison summaries count changed and identical pages", () => {
  assert.deepEqual(
    comparisonSummary([
      { percentChanged: 0 },
      { percentChanged: 0.009 },
      { percentChanged: 4.2 },
    ]),
    { changedPages: 1, identicalPages: 2, totalPages: 3 },
  );
});
