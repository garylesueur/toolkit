import assert from "node:assert/strict";
import test from "node:test";

import { PDFArray, PDFDocument, StandardFonts } from "pdf-lib";

import {
  watermarkPageIndices,
  watermarkPoint,
} from "../lib/pdf/watermark-options.ts";
import { watermarkPdf } from "../lib/pdf/watermark.ts";

test("watermarks default to every page", () => {
  assert.deepEqual(watermarkPageIndices([], 3), [0, 1, 2]);
});

test("watermark ranges are sorted, deduplicated, and validated", () => {
  assert.deepEqual(watermarkPageIndices([2, 0, 2], 4), [0, 2]);
  assert.throws(() => watermarkPageIndices([], 0), /no pages/);
  assert.throws(() => watermarkPageIndices([4], 4), /between 1 and 4/);
});

test("unrotated watermark positions cover the nine-point grid", () => {
  assert.deepEqual(watermarkPoint(600, 800, 100, 20, 0, 30, "bottom-left"), {
    x: 30,
    y: 30,
  });
  assert.deepEqual(watermarkPoint(600, 800, 100, 20, 0, 30, "center"), {
    x: 250,
    y: 390,
  });
  assert.deepEqual(watermarkPoint(600, 800, 100, 20, 0, 30, "top-right"), {
    x: 470,
    y: 750,
  });
});

test("rotated watermarks remain centred by their visual bounding box", () => {
  const point = watermarkPoint(600, 800, 100, 20, 90, 30, "center");
  assert.ok(Math.abs(point.x - 310) < 0.0001);
  assert.ok(Math.abs(point.y - 350) < 0.0001);
});

async function sourcePdf(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let index = 0; index < 2; index++) {
    const page = pdf.addPage([300, 400]);
    page.drawText(`Original ${index + 1}`, { x: 20, y: 350, size: 12, font });
  }
  return pdf.save({ useObjectStreams: false });
}

function streamRefs(bytes: Uint8Array, pageIndex: number): Promise<string[]> {
  return PDFDocument.load(bytes).then((pdf) => {
    const contents = pdf.getPage(pageIndex).node.Contents();
    if (!(contents instanceof PDFArray))
      return contents ? [contents.toString()] : [];
    return Array.from({ length: contents.size() }, (_, index) =>
      contents.get(index).toString(),
    );
  });
}

test("text watermarking modifies only selected pages", async () => {
  const output = await watermarkPdf(await sourcePdf(), {
    colour: "dark",
    fontSize: 28,
    kind: "text",
    layer: "foreground",
    margin: 20,
    opacity: 0.3,
    pages: [1],
    position: "center",
    rotation: -30,
    text: "DRAFT",
  });
  assert.equal((await streamRefs(output, 0)).length, 1);
  assert.equal((await streamRefs(output, 1)).length, 4);
});

test("background watermark stream is ordered before original content", async () => {
  const source = await sourcePdf();
  const foreground = await watermarkPdf(source, {
    colour: "dark",
    fontSize: 24,
    kind: "text",
    layer: "foreground",
    margin: 20,
    opacity: 0.2,
    pages: [0],
    position: "center",
    rotation: 0,
    text: "TEST",
  });
  const background = await watermarkPdf(source, {
    colour: "dark",
    fontSize: 24,
    kind: "text",
    layer: "background",
    margin: 20,
    opacity: 0.2,
    pages: [0],
    position: "center",
    rotation: 0,
    text: "TEST",
  });
  const foregroundRefs = await streamRefs(foreground, 0);
  const backgroundRefs = await streamRefs(background, 0);
  assert.equal(backgroundRefs[0], foregroundRefs.at(-1));
  assert.deepEqual(backgroundRefs.slice(1), foregroundRefs.slice(0, -1));
});
