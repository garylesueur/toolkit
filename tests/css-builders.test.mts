import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBoxShadow,
  buildGradient,
  hexToRgba,
} from "../lib/css/builders.ts";

test("linear gradients normalize angles and order stops", () => {
  assert.equal(
    buildGradient({
      angle: -45,
      radialShape: "ellipse",
      stops: [
        { color: "#FF0000", position: 100 },
        { color: "#0000FF", position: 0 },
      ],
      type: "linear",
    }),
    "linear-gradient(315deg, #0000ff 0%, #ff0000 100%)",
  );
});

test("gradient positions clamp to the visible range", () => {
  assert.equal(
    buildGradient({
      angle: 90,
      radialShape: "ellipse",
      stops: [
        { color: "#000000", position: -20 },
        { color: "#ffffff", position: 130 },
      ],
      type: "linear",
    }),
    "linear-gradient(90deg, #000000 0%, #ffffff 100%)",
  );
});

test("radial gradients support circle and ellipse shapes", () => {
  for (const shape of ["circle", "ellipse"] as const) {
    assert.match(
      buildGradient({
        angle: 0,
        radialShape: shape,
        stops: [
          { color: "#112233", position: 0 },
          { color: "#445566", position: 100 },
        ],
        type: "radial",
      }),
      new RegExp(`^radial-gradient\\(${shape} at center`),
    );
  }
});

test("gradients require two valid six-digit colours", () => {
  assert.throws(
    () =>
      buildGradient({
        angle: 0,
        radialShape: "circle",
        stops: [{ color: "#000000", position: 0 }],
        type: "linear",
      }),
    /at least two/,
  );
  assert.throws(
    () =>
      buildGradient({
        angle: 0,
        radialShape: "circle",
        stops: [
          { color: "red", position: 0 },
          { color: "#ffffff", position: 100 },
        ],
        type: "linear",
      }),
    /Invalid six-digit hex/,
  );
});

test("hex colours convert to bounded RGBA values", () => {
  assert.equal(hexToRgba("#336699", 0.5), "rgba(51, 102, 153, 0.5)");
  assert.equal(hexToRgba("#ffffff", 2), "rgba(255, 255, 255, 1)");
  assert.equal(hexToRgba("#000000", -1), "rgba(0, 0, 0, 0)");
});

test("box shadows include all dimensions and alpha", () => {
  assert.equal(
    buildBoxShadow({
      blur: 24,
      color: "#123456",
      inset: false,
      opacity: 0.25,
      spread: 4,
      x: 8,
      y: 12,
    }),
    "8px 12px 24px 4px rgba(18, 52, 86, 0.25)",
  );
});

test("inset shadows are labelled explicitly", () => {
  assert.match(
    buildBoxShadow({
      blur: 4,
      color: "#000000",
      inset: true,
      opacity: 1,
      spread: 0,
      x: 0,
      y: 1,
    }),
    /^inset 0px 1px 4px 0px/,
  );
});

test("box-shadow dimensions clamp to supported UI bounds", () => {
  assert.equal(
    buildBoxShadow({
      blur: -5,
      color: "#000000",
      inset: false,
      opacity: 0.33333,
      spread: 500,
      x: -999,
      y: 999,
    }),
    "-200px 200px 0px 100px rgba(0, 0, 0, 0.333)",
  );
});

test("box shadows reject malformed colours", () => {
  assert.throws(
    () =>
      buildBoxShadow({
        blur: 0,
        color: "#fff",
        inset: false,
        opacity: 1,
        spread: 0,
        x: 0,
        y: 0,
      }),
    /Invalid six-digit hex/,
  );
});
