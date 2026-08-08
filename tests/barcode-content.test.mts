import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyBarcodeContent,
  friendlyBarcodeFormat,
} from "../lib/security/barcode-content.ts";

test("HTTPS destinations are shown as openable URLs with a safety reminder", () => {
  const result = classifyBarcodeContent("https://example.test/path?q=1");
  assert.equal(result.kind, "URL");
  assert.equal(result.openableUrl, "https://example.test/path?q=1");
  assert.match(result.warning ?? "", /full hostname/);
});

test("HTTP destinations get a stronger transport warning", () => {
  const result = classifyBarcodeContent("http://example.test/login");
  assert.equal(result.openableUrl, "http://example.test/login");
  assert.match(result.warning ?? "", /unencrypted HTTP/);
});

test("dangerous schemes never become openable links", () => {
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,test",
    "file:///etc/passwd",
  ]) {
    assert.equal(classifyBarcodeContent(value).openableUrl, null);
  }
});

test("Wi-Fi payloads are identified as potentially sensitive", () => {
  const result = classifyBarcodeContent("WIFI:T:WPA;S:Office;P:secret;;");
  assert.equal(result.kind, "Wi-Fi configuration");
  assert.match(result.warning ?? "", /password/);
});

test("email, phone, and contact payloads are classified without opening them", () => {
  assert.equal(
    classifyBarcodeContent("mailto:test@example.test").kind,
    "Email",
  );
  assert.equal(classifyBarcodeContent("tel:+441234567890").kind, "Phone");
  assert.equal(
    classifyBarcodeContent("BEGIN:VCARD\nFN:Test\nEND:VCARD").kind,
    "Contact card",
  );
  assert.equal(classifyBarcodeContent("MECARD:N:Test;;").kind, "Contact card");
});

test("ordinary and empty text remain visible as text", () => {
  assert.deepEqual(classifyBarcodeContent("hello"), {
    kind: "Text",
    openableUrl: null,
    text: "hello",
    warning: null,
  });
  assert.match(classifyBarcodeContent(" ").warning ?? "", /empty value/);
});

test("library format constants become readable labels", () => {
  assert.equal(friendlyBarcodeFormat("QR_CODE"), "Qr Code");
  assert.equal(friendlyBarcodeFormat("EAN_13"), "Ean 13");
});
