import assert from "node:assert/strict";
import test from "node:test";

import {
  buildProtectArguments,
  buildUnlockArguments,
  protectedPdfName,
  validatePdfPassword,
  validateProtectOptions,
} from "../lib/pdf/pdf-password-options.ts";

const options = {
  openPassword: "open-sesame",
  ownerPassword: "owner-control",
  permissions: "print" as const,
};

test("protection is fixed to offline AES-256", () => {
  const args = buildProtectArguments(options);
  assert.deepEqual(args.slice(0, 11), [
    "pdfcpu",
    "encrypt",
    "--conf",
    "disable",
    "--offline",
    "--mode",
    "aes",
    "--key",
    "256",
    "--perm",
    "print",
  ]);
  assert.deepEqual(args.slice(-2), ["/input.pdf", "/output.pdf"]);
});

test("passwords are passed to their distinct PDF roles", () => {
  const args = buildProtectArguments(options);
  assert.equal(args[args.indexOf("--upw") + 1], "open-sesame");
  assert.equal(args[args.indexOf("--opw") + 1], "owner-control");
});

test("unlock can try a password as user or owner", () => {
  assert.ok(buildUnlockArguments("secret", "user").includes("--upw"));
  assert.ok(buildUnlockArguments("secret", "owner").includes("--opw"));
});

test("empty and oversized passwords are rejected", () => {
  assert.throws(() => validatePdfPassword("", "Open password"), /required/);
  assert.throws(
    () => validatePdfPassword("😀".repeat(32), "Open password"),
    /127 UTF-8 bytes/,
  );
});

test("open and owner passwords must differ", () => {
  assert.throws(
    () =>
      validateProtectOptions({
        openPassword: "same",
        ownerPassword: "same",
        permissions: "none",
      }),
    /different owner password/,
  );
});

test("unknown permission presets are rejected", () => {
  assert.throws(
    () =>
      validateProtectOptions({
        ...options,
        permissions: "copy" as never,
      }),
    /supported permissions/,
  );
});

test("output names replace only a trailing PDF extension", () => {
  assert.equal(protectedPdfName("Report.PDF", false), "Report-protected.pdf");
  assert.equal(
    protectedPdfName("archive.pdf.backup", true),
    "archive.pdf.backup-unlocked.pdf",
  );
});
