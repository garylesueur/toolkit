import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPdfCpuArguments,
  cleanPdfCpuLog,
  pdfValidationSummary,
} from "../lib/pdf/pdf-health-options.ts";

test("relaxed validation is local, offline, and config-free", () => {
  assert.deepEqual(buildPdfCpuArguments("validate", "relaxed"), [
    "pdfcpu",
    "validate",
    "--conf",
    "disable",
    "--offline",
    "--mode",
    "relaxed",
    "/input.pdf",
  ]);
});

test("strict validation selects the strict standards mode", () => {
  assert.ok(buildPdfCpuArguments("validate", "strict").includes("strict"));
});

test("repair uses pdfcpu optimisation to rebuild a separate output", () => {
  assert.deepEqual(buildPdfCpuArguments("repair", "relaxed"), [
    "pdfcpu",
    "optimize",
    "--conf",
    "disable",
    "--offline",
    "/input.pdf",
    "/output.pdf",
  ]);
});

test("diagnostic logs hide virtual paths and terminal formatting", () => {
  assert.equal(
    cleanPdfCpuLog(
      "\u001b[31m/input.pdf: invalid xref\u001b[0m\n\n/output.pdf written\n",
    ),
    "your PDF: invalid xref\n\nrepaired PDF written",
  );
});

test("empty diagnostics stay empty", () => {
  assert.equal(cleanPdfCpuLog(" \n\r\n"), "");
});

test("validation summaries distinguish modes and failures", () => {
  assert.match(pdfValidationSummary(true, "relaxed"), /compatibility/);
  assert.match(pdfValidationSummary(true, "strict"), /strict PDF 1.7/);
  assert.match(pdfValidationSummary(false, "relaxed"), /structural problems/);
  assert.match(pdfValidationSummary(false, "strict"), /violations/);
});
