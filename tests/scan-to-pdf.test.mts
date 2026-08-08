import assert from "node:assert/strict";
import test from "node:test";

import { PDFDocument } from "pdf-lib";

import {
  normaliseScanCrop,
  scanFilter,
  scanOutputSize,
  scanSourceRect,
} from "../lib/pdf/scan-options.ts";
import { scansToPdf } from "../lib/pdf/scan.ts";

test("scan crops clamp individual edges and reject an empty centre", () => {
  assert.deepEqual(
    normaliseScanCrop({ top: -5, right: 60, bottom: 10, left: 5 }),
    { top: 0, right: 60, bottom: 10, left: 5 },
  );
  assert.throws(
    () => normaliseScanCrop({ top: 50, right: 0, bottom: 45, left: 0 }),
    /too little/,
  );
});

test("percentage crop edges produce a pixel source rectangle", () => {
  assert.deepEqual(
    scanSourceRect(1000, 800, { top: 10, right: 20, bottom: 15, left: 5 }),
    { x: 50, y: 80, width: 750, height: 600 },
  );
});

test("quarter-turn rotations exchange output dimensions", () => {
  assert.deepEqual(scanOutputSize(1200, 800, 0), { width: 1200, height: 800 });
  assert.deepEqual(scanOutputSize(1200, 800, 90), { width: 800, height: 1200 });
  assert.deepEqual(scanOutputSize(1200, 800, 180), {
    width: 1200,
    height: 800,
  });
  assert.deepEqual(scanOutputSize(1200, 800, 270), {
    width: 800,
    height: 1200,
  });
});

test("scan filters clamp contrast and optionally add grayscale", () => {
  assert.equal(scanFilter(false, 120), "contrast(120%)");
  assert.equal(scanFilter(true, 250), "grayscale(1) contrast(200%)");
  assert.equal(scanFilter(true, 10), "grayscale(1) contrast(50%)");
});

test("processed JPEG scans assemble into ordered image-sized PDF pages", async () => {
  const jpeg = Uint8Array.from(
    Buffer.from(
      "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/EB//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/EB//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/EB//2Q==",
      "base64",
    ),
  );
  const output = await scansToPdf([
    { bytes: jpeg, width: 100, height: 200 },
    { bytes: jpeg, width: 300, height: 150 },
  ]);
  const pdf = await PDFDocument.load(output);
  assert.equal(pdf.getPageCount(), 2);
  assert.deepEqual(pdf.getPage(0).getSize(), { width: 75, height: 150 });
  assert.deepEqual(pdf.getPage(1).getSize(), { width: 225, height: 112.5 });
});
