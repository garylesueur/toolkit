import assert from "node:assert/strict";
import test from "node:test";

import { isEmbeddedMarkdownImage } from "../lib/shared/markdown-image.ts";

test("only embedded raster images can load", () => {
  assert.equal(isEmbeddedMarkdownImage("data:image/png;base64,AAAA"), true);
  for (const source of [
    "https://example.com/x?token=secret",
    "//example.com/x",
    "/api/x",
    "blob:x",
    "data:image/svg+xml;base64,AAAA",
    "data:text/html;base64,AAAA",
    "data:image/png;base64,@@@",
    " data:image/png;base64,AAAA",
  ]) {
    assert.equal(isEmbeddedMarkdownImage(source), false, source);
  }
});
