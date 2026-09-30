import assert from "node:assert/strict";
import test from "node:test";

import { inspectImageMetadata } from "../lib/image/metadata.ts";

const encoder = new TextEncoder();
const concat = (...parts: Uint8Array[]) => {
  const output = new Uint8Array(
    parts.reduce((sum, part) => sum + part.length, 0),
  );
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
};

function jpegSegment(marker: number, data: Uint8Array) {
  const length = data.length + 2;
  return concat(
    new Uint8Array([0xff, marker, length >> 8, length & 0xff]),
    data,
  );
}

function simpleExif() {
  const maker = encoder.encode("Canon\0");
  const model = encoder.encode("EOS Test\0");
  const bytes = new Uint8Array(8 + 2 + 24 + 4 + maker.length + model.length);
  const view = new DataView(bytes.buffer);
  bytes.set(encoder.encode("II"), 0);
  view.setUint16(2, 42, true);
  view.setUint32(4, 8, true);
  view.setUint16(8, 2, true);
  const dataStart = 8 + 2 + 24 + 4;
  view.setUint16(10, 0x010f, true);
  view.setUint16(12, 2, true);
  view.setUint32(14, maker.length, true);
  view.setUint32(18, dataStart, true);
  view.setUint16(22, 0x0110, true);
  view.setUint16(24, 2, true);
  view.setUint32(26, model.length, true);
  view.setUint32(30, dataStart + maker.length, true);
  bytes.set(maker, dataStart);
  bytes.set(model, dataStart + maker.length);
  return bytes;
}

test("JPEG inspection finds EXIF device fields, XMP, and comments", () => {
  const jpeg = concat(
    new Uint8Array([0xff, 0xd8]),
    jpegSegment(0xe1, concat(encoder.encode("Exif\0\0"), simpleExif())),
    jpegSegment(0xe1, encoder.encode("http://ns.adobe.com/xap/1.0/\0<xmp>")),
    jpegSegment(0xfe, encoder.encode("edited copy")),
    new Uint8Array([0xff, 0xd9]),
  );
  const result = inspectImageMetadata(jpeg);
  assert.equal(result.format, "JPEG");
  assert.deepEqual(result.metadataBlocks, ["EXIF", "XMP", "JPEG comment"]);
  assert.deepEqual(
    result.fields.map(({ label, value }) => ({ label, value })),
    [
      { label: "Camera maker", value: "Canon" },
      { label: "Camera model", value: "EOS Test" },
      { label: "Comment", value: "edited copy" },
    ],
  );
});

function pngChunk(type: string, data: Uint8Array) {
  const output = new Uint8Array(12 + data.length);
  const view = new DataView(output.buffer);
  view.setUint32(0, data.length);
  output.set(encoder.encode(type), 4);
  output.set(data, 8);
  return output;
}

test("PNG inspection exposes text and metadata block types", () => {
  const png = concat(
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk(
      "tEXt",
      concat(
        encoder.encode("Author"),
        new Uint8Array([0]),
        encoder.encode("Ada"),
      ),
    ),
    pngChunk("iCCP", encoder.encode("profile")),
    pngChunk("IEND", new Uint8Array()),
  );
  const result = inspectImageMetadata(png);
  assert.equal(result.format, "PNG");
  assert.deepEqual(result.metadataBlocks, ["PNG text", "ICC colour profile"]);
  assert.deepEqual(result.fields[0], {
    category: "author",
    label: "Author",
    value: "Ada",
  });
});

function webpChunk(type: string, data: Uint8Array) {
  const output = new Uint8Array(8 + data.length + (data.length % 2));
  output.set(encoder.encode(type), 0);
  new DataView(output.buffer).setUint32(4, data.length, true);
  output.set(data, 8);
  return output;
}

test("WebP inspection identifies EXIF, XMP, and colour profiles", () => {
  const chunks = concat(
    webpChunk("EXIF", concat(encoder.encode("Exif\0\0"), simpleExif())),
    webpChunk("XMP ", encoder.encode("x")),
    webpChunk("ICCP", encoder.encode("icc")),
  );
  const header = new Uint8Array(12);
  header.set(encoder.encode("RIFF"), 0);
  new DataView(header.buffer).setUint32(4, chunks.length + 4, true);
  header.set(encoder.encode("WEBP"), 8);
  const result = inspectImageMetadata(concat(header, chunks));
  assert.equal(result.format, "WebP");
  assert.deepEqual(result.metadataBlocks, [
    "EXIF",
    "XMP",
    "ICC colour profile",
  ]);
  assert.equal(
    result.fields.find((field) => field.label === "Camera maker")?.value,
    "Canon",
  );
});

test("clean images report no metadata blocks", () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  assert.deepEqual(inspectImageMetadata(jpeg).metadataBlocks, []);
});

test("unsupported input is rejected", () => {
  assert.throws(
    () => inspectImageMetadata(encoder.encode("not an image")),
    /JPEG, PNG, or WebP/,
  );
});
