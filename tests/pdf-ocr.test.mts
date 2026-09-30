import assert from "node:assert/strict";
import test from "node:test";

import { PDFDict, PDFDocument, PDFName } from "pdf-lib";

import {
  MAX_OCR_PAGES,
  combineOcrText,
  hasMeaningfulPdfText,
  ocrWordPlacement,
  resolveOcrPages,
  searchableWordText,
} from "../lib/pdf/ocr-options.ts";
import { buildSearchableOcrPdf, raceWithOcrAbort } from "../lib/pdf/ocr.ts";

test("empty OCR ranges select every page", () => {
  assert.deepEqual(resolveOcrPages("", 3), [0, 1, 2]);
});

test("OCR ranges are sorted, deduplicated, and zero-based", () => {
  assert.deepEqual(resolveOcrPages("3, 1-2, 2", 4), [0, 1, 2]);
});

test("invalid and oversized OCR selections are rejected", () => {
  assert.throws(() => resolveOcrPages("0", 2), /out of range/);
  assert.throws(() => resolveOcrPages("", 0), /no pages/);
  assert.throws(
    () => resolveOcrPages("", MAX_OCR_PAGES + 1),
    /at most 50 pages/,
  );
});

test("existing text detection ignores tiny artefacts", () => {
  assert.equal(hasMeaningfulPdfText([{ str: "A" }, { str: "  " }]), false);
  assert.equal(hasMeaningfulPdfText([{ str: "Invoice 42" }]), true);
});

test("searchable overlay text is reduced to safe WinAnsi characters", () => {
  assert.equal(searchableWordText("“Café”—total… •"), '"Cafe"-total... *');
  assert.equal(searchableWordText("東京"), "");
});

test("OCR pixel boxes map to bottom-left PDF coordinates", () => {
  assert.deepEqual(
    ocrWordPlacement(
      {
        text: "Hello",
        confidence: 90,
        x0: 100,
        y0: 200,
        x1: 300,
        y1: 240,
      },
      1000,
      2000,
      500,
      1000,
    ),
    { x: 50, y: 880, size: 18 },
  );
});

test("invalid OCR word boxes are rejected", () => {
  assert.throws(
    () =>
      ocrWordPlacement(
        { text: "x", confidence: 0, x0: 2, y0: 2, x1: 1, y1: 3 },
        100,
        100,
        100,
        100,
      ),
    /invalid word position/,
  );
});

test("plain-text output keeps page boundaries and skip reasons", () => {
  assert.equal(
    combineOcrText([
      {
        pageNumber: 1,
        text: "Hello world\n",
        confidence: 91,
        wordCount: 2,
        skipped: false,
      },
      {
        pageNumber: 2,
        text: "",
        confidence: null,
        wordCount: 0,
        skipped: true,
      },
    ]),
    "--- Page 1 ---\nHello world\n\n--- Page 2 ---\n[Skipped: an existing text layer was detected]",
  );
});

test("an abort rejects promptly even when the OCR operation never settles", async () => {
  const controller = new AbortController();
  const pending = new Promise<never>(() => undefined);
  const guarded = raceWithOcrAbort(pending, controller.signal);
  controller.abort();
  await assert.rejects(
    guarded,
    (cause: unknown) =>
      cause instanceof DOMException && cause.name === "AbortError",
  );
});

test("searchable PDF assembly preserves pages and adds a hidden font layer", async () => {
  const source = await PDFDocument.create();
  source.addPage([300, 400]);
  const bytes = await buildSearchableOcrPdf(await source.save(), [
    {
      pageIndex: 0,
      pageNumber: 1,
      text: "Secret account",
      confidence: 94,
      wordCount: 2,
      skipped: false,
      canvasWidth: 600,
      canvasHeight: 800,
      words: [
        {
          text: "Secret",
          confidence: 94,
          x0: 60,
          y0: 80,
          x1: 150,
          y1: 110,
        },
      ],
    },
  ]);
  const output = await PDFDocument.load(bytes);
  assert.equal(output.getPageCount(), 1);
  const resources = output
    .getPage(0)
    .node.lookup(PDFName.of("Resources"), PDFDict);
  assert.ok(resources.get(PDFName.of("Font")));
});
