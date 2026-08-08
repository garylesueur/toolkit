import assert from "node:assert/strict";
import test from "node:test";

import {
  CSP_PRESETS,
  buildCsp,
  cspWarnings,
  parseCspValues,
} from "../lib/security/csp.ts";

test("source lists are trimmed and deduplicated", () => {
  assert.deepEqual(parseCspValues(" 'self'   https: 'self' "), [
    "'self'",
    "https:",
  ]);
  assert.throws(() => parseCspValues("'self'; script-src *"), /cannot contain/);
});

test("CSP directives serialize deterministically", () => {
  assert.equal(
    buildCsp([
      { name: "default-src", values: ["'self'"] },
      { name: "upgrade-insecure-requests", values: [] },
    ]),
    "default-src 'self'; upgrade-insecure-requests",
  );
});

test("invalid and duplicate directives are rejected", () => {
  assert.throws(
    () => buildCsp([{ name: "script_src", values: [] }]),
    /Invalid/,
  );
  assert.throws(
    () =>
      buildCsp([
        { name: "default-src", values: ["'self'"] },
        { name: "default-src", values: ["'none'"] },
      ]),
    /Duplicate/,
  );
});

test("risky script sources produce high-severity warnings", () => {
  const warnings = cspWarnings([
    { name: "default-src", values: ["'self'"] },
    {
      name: "script-src",
      values: ["*", "'unsafe-inline'", "'unsafe-eval'", "data:"],
    },
  ]);
  assert.deepEqual(
    warnings
      .filter((warning) => warning.severity === "high")
      .map((warning) => warning.code),
    ["wildcard", "unsafe-eval", "unsafe-inline-script", "data-script"],
  );
});

test("strict and API presets have no high or medium warnings", () => {
  for (const preset of [CSP_PRESETS.strict, CSP_PRESETS.api]) {
    assert.deepEqual(
      cspWarnings(preset).filter((warning) => warning.severity !== "info"),
      [],
    );
  }
});

test("website preset discloses its inline-style tradeoff", () => {
  assert.ok(
    cspWarnings(CSP_PRESETS.website).some(
      (warning) => warning.code === "unsafe-inline-style",
    ),
  );
});
