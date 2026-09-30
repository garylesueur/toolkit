import assert from "node:assert/strict";
import test from "node:test";

import {
  checksumLength,
  computeHashBytes,
  normalizeChecksum,
  verifyChecksum,
} from "../lib/hash/generate.ts";

test("byte hashing produces a known SHA-256 digest", async () => {
  const digest = await computeHashBytes(
    "SHA-256",
    new TextEncoder().encode("hello"),
  );
  assert.equal(
    digest,
    "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
  );
});

test("checksum normalization accepts common prefixes and checksum-file lines", () => {
  assert.equal(normalizeChecksum("SHA256: A0B1c2"), "a0b1c2");
  assert.equal(normalizeChecksum("sha-512 = deadBEEF"), "deadbeef");
  assert.equal(normalizeChecksum("abc123  archive.zip"), "abc123");
  assert.equal(normalizeChecksum("not a checksum"), "");
});

test("supported algorithms expose their exact hexadecimal digest lengths", () => {
  assert.equal(checksumLength("SHA-1"), 40);
  assert.equal(checksumLength("SHA-256"), 64);
  assert.equal(checksumLength("SHA-384"), 96);
  assert.equal(checksumLength("SHA-512"), 128);
});

test("checksum verification distinguishes empty, invalid, matching, and mismatching input", () => {
  const actual = "a".repeat(64);
  assert.equal(verifyChecksum(actual, "", "SHA-256"), "empty");
  assert.equal(verifyChecksum(actual, "abcd", "SHA-256"), "invalid");
  assert.equal(
    verifyChecksum(actual, `SHA256: ${"A".repeat(64)}`, "SHA-256"),
    "match",
  );
  assert.equal(verifyChecksum(actual, "b".repeat(64), "SHA-256"), "mismatch");
});
