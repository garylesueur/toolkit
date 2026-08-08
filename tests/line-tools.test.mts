import assert from "node:assert/strict";
import test from "node:test";

import {
  getLineStats,
  shuffleLines,
  transformLines,
} from "../lib/text/line-tools.ts";
import type { LineTransformOptions } from "../lib/text/line-tools.ts";

const DEFAULTS: LineTransformOptions = {
  caseSensitive: true,
  numberSeparator: ". ",
  numericSort: false,
  operation: "sort",
  padNumbers: false,
  removeBlankLines: false,
  sortDirection: "ascending",
  startNumber: 1,
  trimLines: false,
};

test("alphabetical sorting supports ascending and descending order", () => {
  assert.equal(
    transformLines("pear\napple\nbanana", DEFAULTS),
    "apple\nbanana\npear",
  );
  assert.equal(
    transformLines("pear\napple\nbanana", {
      ...DEFAULTS,
      sortDirection: "descending",
    }),
    "pear\nbanana\napple",
  );
});

test("natural numeric sorting orders embedded numbers usefully", () => {
  assert.equal(
    transformLines("item10\nitem2\nitem1", { ...DEFAULTS, numericSort: true }),
    "item1\nitem2\nitem10",
  );
});

test("case-insensitive deduplication preserves the first spelling", () => {
  assert.equal(
    transformLines("Alpha\nalpha\nBETA\nbeta", {
      ...DEFAULTS,
      caseSensitive: false,
      operation: "deduplicate",
    }),
    "Alpha\nBETA",
  );
});

test("case-sensitive deduplication keeps differently cased lines", () => {
  assert.equal(
    transformLines("Alpha\nalpha\nAlpha", {
      ...DEFAULTS,
      operation: "deduplicate",
    }),
    "Alpha\nalpha",
  );
});

test("trimming and blank-line removal happen before the selected operation", () => {
  assert.equal(
    transformLines("  beta  \n \n alpha ", {
      ...DEFAULTS,
      removeBlankLines: true,
      trimLines: true,
    }),
    "alpha\nbeta",
  );
});

test("line reversal preserves content exactly", () => {
  assert.equal(
    transformLines("one\ntwo\nthree", { ...DEFAULTS, operation: "reverse" }),
    "three\ntwo\none",
  );
});

test("line numbering supports a start value, padding, and separator", () => {
  assert.equal(
    transformLines("a\nb\nc", {
      ...DEFAULTS,
      numberSeparator: " | ",
      operation: "number",
      padNumbers: true,
      startNumber: 98,
    }),
    "098 | a\n099 | b\n100 | c",
  );
});

test("shuffle uses Fisher-Yates without mutating its source", () => {
  const source = ["a", "b", "c"];
  assert.deepEqual(
    shuffleLines(source, () => 0),
    ["b", "c", "a"],
  );
  assert.deepEqual(source, ["a", "b", "c"]);
});

test("non-finite shuffle values are bounded safely", () => {
  assert.deepEqual(
    shuffleLines(["a", "b", "c"], () => Number.NaN),
    ["b", "c", "a"],
  );
});

test("CRLF and classic Mac line endings normalize to newlines", () => {
  assert.equal(
    transformLines("c\r\na\rb", { ...DEFAULTS, operation: "reverse" }),
    "b\na\nc",
  );
});

test("line statistics report blank and case-aware unique counts", () => {
  assert.deepEqual(getLineStats("Alpha\nalpha\n\nBeta", false), {
    blank: 1,
    lines: 4,
    unique: 3,
  });
  assert.deepEqual(getLineStats(""), { blank: 0, lines: 0, unique: 0 });
});
