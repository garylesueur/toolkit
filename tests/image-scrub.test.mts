import assert from "node:assert/strict";
import test from "node:test";

import { imageTypeForFile, scrubbedImageName } from "../lib/image/scrub.ts";

test("image types prefer MIME and fall back to familiar extensions", () => {
  assert.equal(
    imageTypeForFile({ name: "photo.bin", type: "image/jpeg" }),
    "image/jpeg",
  );
  assert.equal(imageTypeForFile({ name: "photo.PNG", type: "" }), "image/png");
  assert.equal(
    imageTypeForFile({ name: "photo.webp", type: "application/octet-stream" }),
    "image/webp",
  );
});

test("unsupported file types are rejected", () => {
  assert.throws(
    () => imageTypeForFile({ name: "photo.gif", type: "image/gif" }),
    /JPEG, PNG, or WebP/,
  );
});

test("scrubbed output names are stable and use the encoded format", () => {
  assert.equal(
    scrubbedImageName("holiday.jpeg", "image/jpeg"),
    "holiday-metadata-removed.jpg",
  );
  assert.equal(
    scrubbedImageName("diagram.PNG", "image/png"),
    "diagram-metadata-removed.png",
  );
  assert.equal(
    scrubbedImageName("no-extension", "image/webp"),
    "no-extension-metadata-removed.webp",
  );
});
