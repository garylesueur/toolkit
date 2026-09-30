import assert from "node:assert/strict";
import test from "node:test";

import { PDFDict, PDFDocument, PDFName } from "pdf-lib";

import {
  normaliseRedactionBox,
  redactionBoxFromPercentages,
  redactionCanvasRect,
  redactionPreviewStyle,
  redactionsOnPage,
  validateRedactions,
} from "../lib/pdf/redact-options.ts";
import { verifyRedactedPdf } from "../lib/pdf/redact.ts";
import { assembleCompressedPdf } from "../lib/pdf/strong-compress-assemble.ts";

const JPEG = Uint8Array.from(
  Buffer.from(
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/EH//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/EH//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/EH//2Q==",
    "base64",
  ),
);

test("dragging in any direction creates the same normalised box", () => {
  assert.deepEqual(normaliseRedactionBox(1, 80, 60, 20, 10, 100, 100), {
    pageIndex: 1,
    x: 0.2,
    y: 0.1,
    width: 0.6,
    height: 0.5,
  });
});

test("drag points clamp to the page surface", () => {
  assert.deepEqual(normaliseRedactionBox(0, -20, -10, 140, 120, 100, 100), {
    pageIndex: 0,
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  });
});

test("invalid drawing surfaces are rejected", () => {
  assert.throws(
    () => normaliseRedactionBox(-1, 0, 0, 10, 10, 100, 100),
    /surface is invalid/,
  );
  assert.throws(
    () => normaliseRedactionBox(0, 0, 0, 10, 10, 0, 100),
    /surface is invalid/,
  );
});

test("normalised boxes map exactly to output pixels", () => {
  assert.deepEqual(
    redactionCanvasRect(
      { pageIndex: 0, x: 0.25, y: 0.1, width: 0.5, height: 0.2 },
      1200,
      800,
    ),
    { x: 300, y: 80, width: 600, height: 160 },
  );
});

test("percentage entry creates a precise validated area", () => {
  assert.deepEqual(redactionBoxFromPercentages(1, 10, 20, 60, 15), {
    pageIndex: 1,
    x: 0.1,
    y: 0.2,
    width: 0.6,
    height: 0.15,
  });
  assert.throws(
    () => redactionBoxFromPercentages(0, 80, 20, 30, 10),
    /outside/,
  );
});

test("preview styles use matching percentages", () => {
  assert.deepEqual(
    redactionPreviewStyle({
      pageIndex: 0,
      x: 0.25,
      y: 0.1,
      width: 0.5,
      height: 0.2,
    }),
    { left: "25%", top: "10%", width: "50%", height: "20%" },
  );
});

test("redactions group by zero-based page", () => {
  const boxes = [
    { pageIndex: 0, x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
    { pageIndex: 1, x: 0.3, y: 0.3, width: 0.2, height: 0.2 },
  ];
  assert.deepEqual(redactionsOnPage(boxes, 1), [boxes[1]]);
});

test("validation requires visible in-page redactions", () => {
  assert.throws(() => validateRedactions([], 1), /at least one/);
  assert.throws(
    () =>
      validateRedactions(
        [{ pageIndex: 1, x: 0, y: 0, width: 0.2, height: 0.2 }],
        1,
      ),
    /outside/,
  );
  assert.throws(
    () =>
      validateRedactions(
        [{ pageIndex: 0, x: 0.9, y: 0, width: 0.2, height: 0.2 }],
        1,
      ),
    /outside/,
  );
});

test("a flattened image-only PDF passes structural verification", async () => {
  const bytes = await assembleCompressedPdf([
    { jpegBytes: JPEG, pageWidth: 612, pageHeight: 792 },
  ]);
  await assert.doesNotReject(verifyRedactedPdf(bytes, 1));
});

test("verification rejects remaining form and annotation structures", async () => {
  const formPdf = await PDFDocument.create();
  formPdf.addPage([100, 100]);
  formPdf.getForm().createTextField("secret");
  await assert.rejects(
    verifyRedactedPdf(await formPdf.save(), 1),
    /remaining AcroForm/,
  );

  const annotationPdf = await PDFDocument.create();
  const page = annotationPdf.addPage([100, 100]);
  page.node.set(
    PDFName.of("Annots"),
    annotationPdf.context.obj([{ Subtype: "Text" }]),
  );
  await assert.rejects(
    verifyRedactedPdf(await annotationPdf.save(), 1),
    /remaining annotations/,
  );
});

test("verification rejects attachments and optional-content layers", async () => {
  const attachmentPdf = await PDFDocument.create();
  attachmentPdf.addPage([100, 100]);
  await attachmentPdf.attach(Uint8Array.of(1, 2, 3), "secret.txt");
  await assert.rejects(
    verifyRedactedPdf(await attachmentPdf.save(), 1),
    /remaining Names/,
  );

  const layeredPdf = await PDFDocument.create();
  layeredPdf.addPage([100, 100]);
  layeredPdf.catalog.set(
    PDFName.of("OCProperties"),
    layeredPdf.context.obj({ OCGs: [] }),
  );
  await assert.rejects(
    verifyRedactedPdf(await layeredPdf.save(), 1),
    /remaining OCProperties/,
  );
});

test("verified pages contain an image but no font resources", async () => {
  const bytes = await assembleCompressedPdf([
    { jpegBytes: JPEG, pageWidth: 100, pageHeight: 100 },
  ]);
  const pdf = await PDFDocument.load(bytes);
  const resources = pdf
    .getPage(0)
    .node.lookup(PDFName.of("Resources"), PDFDict);
  assert.ok(resources.get(PDFName.of("XObject")));
  const fonts = resources.lookupMaybe(PDFName.of("Font"), PDFDict);
  assert.equal(fonts?.keys().length ?? 0, 0);
});
