import assert from "node:assert/strict";
import test from "node:test";

import { normaliseBarcodeValue } from "../lib/barcode/generate.ts";

test("Code 128 preserves printable ASCII values", () => {
  assert.deepEqual(normaliseBarcodeValue("  Order-123/ABC  ", "CODE128"), {
    value: "Order-123/ABC",
  });
});

test("Code 128 rejects controls and overly long values", () => {
  assert.throws(
    () => normaliseBarcodeValue("hello\nworld", "CODE128"),
    /printable ASCII/,
  );
  assert.throws(
    () => normaliseBarcodeValue("x".repeat(101), "CODE128"),
    /limited to 100/,
  );
});

test("EAN-13 calculates and validates its check digit", () => {
  assert.deepEqual(normaliseBarcodeValue("400638133393", "EAN13"), {
    value: "4006381333931",
    checkDigit: "1",
  });
  assert.equal(
    normaliseBarcodeValue("4006381333931", "EAN13").value,
    "4006381333931",
  );
  assert.throws(
    () => normaliseBarcodeValue("4006381333932", "EAN13"),
    /check digit should be 1/,
  );
});

test("EAN-8 calculates and validates its check digit", () => {
  assert.deepEqual(normaliseBarcodeValue("9638507", "EAN8"), {
    value: "96385074",
    checkDigit: "4",
  });
});

test("UPC-A calculates a check digit from eleven digits", () => {
  assert.deepEqual(normaliseBarcodeValue("03600029145", "UPC"), {
    value: "036000291452",
    checkDigit: "2",
  });
});

test("ITF-14 calculates a check digit from thirteen digits", () => {
  assert.deepEqual(normaliseBarcodeValue("1001234500001", "ITF14"), {
    value: "10012345000017",
    checkDigit: "7",
  });
});

test("retail formats reject non-digits and wrong lengths", () => {
  assert.throws(() => normaliseBarcodeValue("ABC", "EAN13"), /digits only/);
  assert.throws(
    () => normaliseBarcodeValue("12345", "EAN8"),
    /requires 7 data digits/,
  );
});

test("Code 39 uppercases supported input and rejects other characters", () => {
  assert.deepEqual(normaliseBarcodeValue("stock-42", "CODE39"), {
    value: "STOCK-42",
  });
  assert.throws(
    () => normaliseBarcodeValue("café", "CODE39"),
    /Code 39 accepts/,
  );
});

test("Codabar accepts its compact numeric character set", () => {
  assert.deepEqual(normaliseBarcodeValue("1234-56/7", "codabar"), {
    value: "1234-56/7",
  });
  assert.throws(
    () => normaliseBarcodeValue("ORDER123", "codabar"),
    /Codabar accepts/,
  );
});

test("all formats reject empty input", () => {
  assert.throws(() => normaliseBarcodeValue("   ", "CODE128"), /Enter a value/);
});
