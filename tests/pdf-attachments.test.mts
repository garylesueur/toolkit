import assert from "node:assert/strict";
import test from "node:test";

import { PDFDocument } from "pdf-lib";

import {
  inspectPdfAttachments,
  removePdfAttachments,
} from "../lib/pdf/attachments.ts";

const encoder = new TextEncoder();

async function attachedPdf(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.addPage([300, 400]);
  await pdf.attach(encoder.encode("alpha contents"), "alpha.txt", {
    description: "First test file",
    mimeType: "text/plain",
  });
  await pdf.attach(encoder.encode('{"safe":true}'), "data.json", {
    mimeType: "application/json",
  });
  return pdf.save();
}

test("attachment inspection returns names, metadata, and exact decoded bytes", async () => {
  const attachments = await inspectPdfAttachments(await attachedPdf());
  assert.equal(attachments.length, 2);
  assert.deepEqual(
    attachments.map(({ description, mimeType, name, size }) => ({
      description,
      mimeType,
      name,
      size,
    })),
    [
      {
        description: "First test file",
        mimeType: "text/plain",
        name: "alpha.txt",
        size: 14,
      },
      {
        description: null,
        mimeType: "application/json",
        name: "data.json",
        size: 13,
      },
    ],
  );
  assert.equal(
    new TextDecoder().decode(attachments[0].bytes),
    "alpha contents",
  );
  assert.equal(new TextDecoder().decode(attachments[1].bytes), '{"safe":true}');
});

test("a PDF without an embedded-files name tree reports no attachments", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  assert.deepEqual(await inspectPdfAttachments(await pdf.save()), []);
});

test("selected attachments are removed while unselected files remain intact", async () => {
  const source = await attachedPdf();
  const before = await inspectPdfAttachments(source);
  const output = await removePdfAttachments(source, [before[0].id]);
  const after = await inspectPdfAttachments(output);
  assert.equal(after.length, 1);
  assert.equal(after[0].name, "data.json");
  assert.equal(new TextDecoder().decode(after[0].bytes), '{"safe":true}');
});

test("all attachments can be removed without damaging PDF pages", async () => {
  const source = await attachedPdf();
  const attachments = await inspectPdfAttachments(source);
  const output = await removePdfAttachments(
    source,
    attachments.map((attachment) => attachment.id),
  );
  assert.deepEqual(await inspectPdfAttachments(output), []);
  assert.equal((await PDFDocument.load(output)).getPageCount(), 1);
});

test("removal requires a matching attachment selection", async () => {
  await assert.rejects(removePdfAttachments(await attachedPdf(), []), /Select/);
  await assert.rejects(
    removePdfAttachments(await attachedPdf(), ["missing"]),
    /Select/,
  );
});
