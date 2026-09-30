import assert from "node:assert/strict";
import test from "node:test";

import { PDFArray, PDFDocument } from "pdf-lib";

import {
  formatPageNumber,
  numberedPageIndices,
  pageNumberPoint,
} from "../lib/pdf/page-number-options.ts";
import { addPageNumbers } from "../lib/pdf/page-numbers.ts";

test("page-number labels support all formats", () => {
  assert.equal(formatPageNumber(3, 12, "number"), "3");
  assert.equal(formatPageNumber(3, 12, "page"), "Page 3");
  assert.equal(formatPageNumber(3, 12, "fraction"), "3 / 12");
});

test("all pages are selected when no range is supplied", () => {
  assert.deepEqual(numberedPageIndices([], 4), [0, 1, 2, 3]);
});

test("selected numbering pages are sorted and deduplicated", () => {
  assert.deepEqual(numberedPageIndices([3, 1, 3, 0], 5), [0, 1, 3]);
});

test("numbering rejects empty PDFs and invalid pages", () => {
  assert.throws(() => numberedPageIndices([], 0), /no pages/);
  assert.throws(() => numberedPageIndices([-1], 3), /between 1 and 3/);
  assert.throws(() => numberedPageIndices([3], 3), /between 1 and 3/);
});

test("left positions respect the requested margin", () => {
  assert.deepEqual(pageNumberPoint(600, 800, 40, 12, 30, "bottom-left"), {
    x: 30,
    y: 30,
  });
  assert.deepEqual(pageNumberPoint(600, 800, 40, 12, 30, "top-left"), {
    x: 30,
    y: 758,
  });
});

test("centred positions account for the rendered label width", () => {
  assert.deepEqual(pageNumberPoint(600, 800, 40, 12, 30, "bottom-center"), {
    x: 280,
    y: 30,
  });
  assert.deepEqual(pageNumberPoint(600, 800, 40, 12, 30, "top-center"), {
    x: 280,
    y: 758,
  });
});

test("right positions subtract both margin and label width", () => {
  assert.deepEqual(pageNumberPoint(600, 800, 40, 12, 30, "bottom-right"), {
    x: 530,
    y: 30,
  });
  assert.deepEqual(pageNumberPoint(600, 800, 40, 12, 30, "top-right"), {
    x: 530,
    y: 758,
  });
});

test("positions never become negative on unusually small pages", () => {
  assert.deepEqual(pageNumberPoint(20, 20, 40, 12, 30, "top-right"), {
    x: 0,
    y: 0,
  });
});

test("the PDF transform modifies only selected pages", async () => {
  const source = await PDFDocument.create();
  source.addPage([300, 400]);
  source.addPage([300, 400]);
  source.addPage([300, 400]);

  const output = await addPageNumbers(await source.save(), {
    colour: "dark",
    fontSize: 12,
    format: "page",
    margin: 24,
    pages: [1, 2],
    position: "bottom-center",
    startNumber: 5,
  });
  const numbered = await PDFDocument.load(output);
  const contentCounts = numbered.getPages().map((page) => {
    const contents = page.node.Contents();
    if (!contents) return 0;
    return contents instanceof PDFArray ? contents.size() : 1;
  });

  assert.deepEqual(contentCounts, [0, 1, 1]);
  assert.ok(output.byteLength > 0);
});
