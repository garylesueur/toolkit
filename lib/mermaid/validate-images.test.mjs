import assert from "node:assert/strict";
import { test } from "node:test";

import { validateMermaidImageNodes } from "./validate-images.ts";

test("rejects image references that could load resources outside the file", () => {
  const references = [
    "https://example.com/tracker.png",
    "http://example.com/tracker.png",
    "//example.com/tracker.png",
    "/tracker.png",
    "../tracker.png",
    "tracker.png",
    "blob:https://example.com/image",
    "data:image/svg+xml;base64,PHN2Zy8+",
    "data:image/png;base64,PHN2Zy8+",
    "data:image/png;base64,invalid=base64",
  ];
  for (const img of references) {
    assert.throws(
      () => validateMermaidImageNodes([{ img }]),
      /To keep your file private/,
      img,
    );
  }
});

test("allows ordinary nodes and embedded raster image data", () => {
  validateMermaidImageNodes([{}, { img: "" }]);
  const rasters = [
    ["png", "\x89PNG\r\n\x1a\n"],
    ["jpeg", "\xff\xd8\xff"],
    ["gif", "GIF89a"],
    ["webp", "RIFF\x00\x00\x00\x00WEBP"],
  ];
  for (const [format, signature] of rasters) {
    const img = `data:image/${format};base64,${btoa(signature)}`;
    validateMermaidImageNodes([{ img }]);
  }
});
