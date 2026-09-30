import assert from "node:assert/strict";
import test from "node:test";

import {
  analysePassword,
  hasSequence,
} from "../lib/security/password-strength.ts";

test("empty passwords return a neutral prompt", () => {
  const result = analysePassword("");
  assert.equal(result.score, 0);
  assert.equal(result.estimatedEntropy, 0);
  assert.deepEqual(result.warnings, []);
});

test("common passwords receive pattern-specific warnings", () => {
  const result = analysePassword("Password123!");
  assert.ok(result.score <= 1);
  assert.ok(
    result.warnings.some((warning) => warning.includes("commonly guessed")),
  );
  assert.ok(
    result.warnings.some((warning) => warning.includes("word-plus-number")),
  );
});

test("long random-looking passwords score strongly", () => {
  const result = analysePassword("vN7$zQ2!mR9@xT4#pL8&");
  assert.equal(result.score, 4);
  assert.equal(result.label, "Very strong");
  assert.deepEqual(result.warnings, []);
  assert.ok(result.estimatedEntropy >= 80);
});

test("repeats, dates, and low uniqueness are penalised", () => {
  const result = analysePassword("aaaaaaa2024aaaaaaa");
  assert.ok(result.warnings.some((warning) => warning.includes("repeated")));
  assert.ok(result.warnings.some((warning) => warning.includes("date-like")));
  assert.ok(result.warnings.some((warning) => warning.includes("unique")));
});

test("sequence detection covers forwards, backwards, numeric, and keyboard runs", () => {
  assert.equal(hasSequence("xxabcdyy"), true);
  assert.equal(hasSequence("xxdcbaYY"), true);
  assert.equal(hasSequence("pin-4567"), true);
  assert.equal(hasSequence("xxqwertYY"), true);
  assert.equal(hasSequence("unrelated words"), false);
});

test("long passphrases benefit from length but common words remain visible", () => {
  const result = analysePassword("welcome-cobalt-orbit-tulip-river");
  assert.ok(result.estimatedEntropy > 60);
  assert.ok(
    result.warnings.some((warning) => warning.includes("commonly guessed")),
  );
  assert.ok(result.score < 4);
});
