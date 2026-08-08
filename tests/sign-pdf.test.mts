import assert from "node:assert/strict";
import test from "node:test";

import { PDFArray, PDFDocument, StandardFonts } from "pdf-lib";

import {
  fitSignatureSize,
  signaturePageIndex,
  signaturePoint,
} from "../lib/pdf/signature-options.ts";
import { placeSignaturePdf } from "../lib/pdf/signature.ts";

test("signature page selection validates a single zero-based page", () => {
  assert.equal(signaturePageIndex(1, 3), 1);
  assert.throws(() => signaturePageIndex(-1, 3), /between 1 and 3/);
  assert.throws(() => signaturePageIndex(3, 3), /between 1 and 3/);
  assert.throws(() => signaturePageIndex(0.5, 3), /between 1 and 3/);
  assert.throws(() => signaturePageIndex(0, 0), /no pages/);
});

test("signature sizing respects width, page bounds, and aspect ratio", () => {
  assert.deepEqual(fitSignatureSize(600, 800, 3, 30, 20), {
    width: 180,
    height: 60,
  });
  assert.deepEqual(fitSignatureSize(300, 200, 0.5, 90, 20), {
    width: 80,
    height: 160,
  });
  assert.throws(() => fitSignatureSize(600, 800, 0, 30, 20), /invalid/);
  assert.throws(() => fitSignatureSize(600, 800, 3, 100, 20), /invalid/);
});

test("signature positions map to expected page coordinates", () => {
  assert.deepEqual(signaturePoint(600, 800, 180, 60, 24, "bottom-left"), {
    x: 24,
    y: 24,
  });
  assert.deepEqual(signaturePoint(600, 800, 180, 60, 24, "center"), {
    x: 210,
    y: 370,
  });
  assert.deepEqual(signaturePoint(600, 800, 180, 60, 24, "top-right"), {
    x: 396,
    y: 716,
  });
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

async function streamCount(bytes: Uint8Array, pageIndex: number) {
  const pdf = await PDFDocument.load(bytes);
  const contents = pdf.getPage(pageIndex).node.Contents();
  if (!(contents instanceof PDFArray)) return contents ? 1 : 0;
  return contents.size();
}

test("typed signatures modify only the chosen page", async () => {
  const output = await placeSignaturePdf(await sourcePdf(), {
    colour: "blue",
    kind: "text",
    margin: 20,
    page: 1,
    position: "bottom-right",
    text: "Ada Lovelace",
    widthPercent: 35,
  });
  assert.equal(await streamCount(output, 0), 1);
  assert.equal(await streamCount(output, 1), 4);
});

test("blank typed signatures are rejected", async () => {
  await assert.rejects(
    placeSignaturePdf(await sourcePdf(), {
      colour: "black",
      kind: "text",
      margin: 20,
      page: 0,
      position: "center",
      text: "   ",
      widthPercent: 30,
    }),
    /Enter a signature/,
  );
});
