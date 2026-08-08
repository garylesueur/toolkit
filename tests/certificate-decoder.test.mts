import assert from "node:assert/strict";
import test from "node:test";

import "reflect-metadata";
import {
  BasicConstraintsExtension,
  ExtendedKeyUsage,
  ExtendedKeyUsageExtension,
  KeyUsageFlags,
  KeyUsagesExtension,
  SubjectAlternativeNameExtension,
  X509CertificateGenerator,
  cryptoProvider,
} from "@peculiar/x509";

import {
  certificateValidity,
  decodeCertificates,
  extractPemCertificates,
  formatFingerprint,
} from "../lib/security/certificate-decoder.ts";

const NOT_BEFORE = new Date("2026-01-01T00:00:00Z");
const NOT_AFTER = new Date("2027-01-01T00:00:00Z");

async function createCertificate(): Promise<string> {
  cryptoProvider.set(globalThis.crypto);
  const algorithm = {
    name: "ECDSA",
    namedCurve: "P-256",
    hash: "SHA-256",
  };
  const keys = await crypto.subtle.generateKey(algorithm, false, [
    "sign",
    "verify",
  ]);
  const certificate = await X509CertificateGenerator.createSelfSigned({
    extensions: [
      new BasicConstraintsExtension(false, undefined, true),
      new KeyUsagesExtension(
        KeyUsageFlags.digitalSignature | KeyUsageFlags.keyAgreement,
        true,
      ),
      new ExtendedKeyUsageExtension([ExtendedKeyUsage.serverAuth]),
      new SubjectAlternativeNameExtension([
        { type: "dns", value: "example.test" },
        { type: "ip", value: "127.0.0.1" },
      ]),
    ],
    keys,
    name: "CN=example.test,O=Toolkit Tests",
    notAfter: NOT_AFTER,
    notBefore: NOT_BEFORE,
    serialNumber: "01AB",
    signingAlgorithm: algorithm,
  });
  return certificate.toString("pem");
}

test("PEM extraction supports chains and plain Base64", async () => {
  const pem = await createCertificate();
  assert.equal(extractPemCertificates(`${pem}\n${pem}`).length, 2);
  assert.deepEqual(extractPemCertificates("YWJjZA=="), ["YWJjZA=="]);
});

test("private keys are rejected before parsing", () => {
  assert.throws(
    () =>
      extractPemCertificates(
        "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----",
      ),
    /Private keys are not accepted/,
  );
});

test("empty and malformed certificate input is rejected", () => {
  assert.throws(() => extractPemCertificates("  "), /Paste a PEM/);
  assert.throws(
    () => extractPemCertificates("not a certificate!"),
    /does not look/,
  );
});

test("validity distinguishes current, expired, and future certificates", () => {
  assert.equal(
    certificateValidity(NOT_BEFORE, NOT_AFTER, new Date("2026-06-01")),
    "valid",
  );
  assert.equal(
    certificateValidity(NOT_BEFORE, NOT_AFTER, new Date("2025-06-01")),
    "not-yet-valid",
  );
  assert.equal(
    certificateValidity(NOT_BEFORE, NOT_AFTER, new Date("2028-06-01")),
    "expired",
  );
});

test("fingerprints use conventional uppercase colon-separated bytes", () => {
  assert.equal(
    formatFingerprint(Uint8Array.from([0, 10, 255]).buffer),
    "00:0A:FF",
  );
});

test("X.509 details, usages, SANs, and fingerprints decode locally", async () => {
  const result = await decodeCertificates(
    await createCertificate(),
    new Date("2026-06-01"),
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].subject, "CN=example.test, O=Toolkit Tests");
  assert.equal(result[0].issuer, result[0].subject);
  assert.equal(result[0].serialNumber, "01AB");
  assert.equal(result[0].validity, "valid");
  assert.equal(result[0].selfIssued, true);
  assert.equal(result[0].issuerIndex, 0);
  assert.match(result[0].publicKey, /ECDSA.*P-256/);
  assert.match(result[0].signatureAlgorithm, /ECDSA.*SHA-256/);
  assert.deepEqual(result[0].keyUsages, ["Digital signature", "Key agreement"]);
  assert.deepEqual(result[0].extendedKeyUsages, ["TLS server authentication"]);
  assert.deepEqual(result[0].sans, [
    { type: "dns", value: "example.test" },
    { type: "ip", value: "127.0.0.1" },
  ]);
  assert.equal(result[0].basicConstraints, "End-entity certificate");
  assert.match(result[0].sha1, /^(?:[0-9A-F]{2}:){19}[0-9A-F]{2}$/);
  assert.match(result[0].sha256, /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/);
});

test("invalid DER data produces a stable parsing error", async () => {
  await assert.rejects(
    () => decodeCertificates("YWJjZA=="),
    /could not be decoded/,
  );
});
