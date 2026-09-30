import assert from "node:assert/strict";
import test from "node:test";

import {
  bookmarkImportJson,
  buildBookmarkArguments,
  countPdfBookmarks,
  flattenPdfBookmarks,
  isNoBookmarksDiagnostic,
  nestPdfBookmarkRows,
  parsePdfCpuBookmarkExport,
  validatePdfBookmarks,
} from "../lib/pdf/bookmarks-options.ts";

test("bookmark commands stay offline and use only virtual files", () => {
  assert.deepEqual(buildBookmarkArguments("export"), [
    "pdfcpu",
    "bookmarks",
    "export",
    "--conf",
    "disable",
    "--offline",
    "/input.pdf",
    "/bookmarks.json",
  ]);
  assert.deepEqual(buildBookmarkArguments("import"), [
    "pdfcpu",
    "bookmarks",
    "import",
    "--replace",
    "--conf",
    "disable",
    "--offline",
    "/input.pdf",
    "/bookmarks.json",
    "/output.pdf",
  ]);
  assert.deepEqual(buildBookmarkArguments("remove"), [
    "pdfcpu",
    "bookmarks",
    "remove",
    "--conf",
    "disable",
    "--offline",
    "/input.pdf",
    "/output.pdf",
  ]);
});

test("only the explicit no-bookmarks diagnostic becomes an empty tree", () => {
  assert.equal(
    isNoBookmarksDiagnostic(
      "export bookmarks: your PDF: no bookmarks available",
    ),
    true,
  );
  assert.equal(
    isNoBookmarksDiagnostic("bookmarks unavailable after failure"),
    false,
  );
});

test("bookmark export parsing keeps hierarchy, styles, and colours", () => {
  const bookmarks = parsePdfCpuBookmarkExport(
    JSON.stringify({
      header: { source: "ignored.pdf" },
      bookmarks: [
        {
          title: "Chapter 1",
          page: 1,
          bold: true,
          color: { R: 0.1, G: 0.2, B: 0.3 },
          kids: [{ title: "Details", page: 2, italic: true }],
        },
      ],
    }),
    2,
  );
  assert.equal(countPdfBookmarks(bookmarks), 2);
  assert.deepEqual(bookmarks[0], {
    title: "Chapter 1",
    page: 1,
    bold: true,
    italic: undefined,
    color: { R: 0.1, G: 0.2, B: 0.3 },
    kids: [
      {
        title: "Details",
        page: 2,
        bold: undefined,
        italic: true,
        color: undefined,
      },
    ],
  });
});

test("bookmark validation trims titles and accepts the last PDF page", () => {
  assert.deepEqual(validatePdfBookmarks([{ title: "  End  ", page: 3 }], 3), [
    {
      title: "End",
      page: 3,
      bold: undefined,
      italic: undefined,
      color: undefined,
    },
  ]);
});

test("bookmark validation rejects empty titles and pages outside the PDF", () => {
  assert.throws(
    () => validatePdfBookmarks([{ title: " ", page: 1 }], 2),
    /needs a title/,
  );
  assert.throws(
    () => validatePdfBookmarks([{ title: "Bad", page: 3 }], 2),
    /outside this PDF/,
  );
});

test("bookmark validation rejects invalid styles and RGB channels", () => {
  assert.throws(
    () => validatePdfBookmarks([{ title: "Bad", page: 1, bold: "yes" }], 1),
    /bold must be true or false/,
  );
  assert.throws(
    () =>
      validatePdfBookmarks(
        [{ title: "Bad", page: 1, color: { R: 2, G: 0, B: 0 } }],
        1,
      ),
    /RGB channels/,
  );
});

test("bookmark validation bounds nesting, total count, and title length", () => {
  let nested: unknown = [{ title: "Deep", page: 1 }];
  for (let index = 0; index < 8; index += 1) {
    nested = [{ title: `Level ${index}`, page: 1, kids: nested }];
  }
  assert.throws(() => validatePdfBookmarks(nested, 1), /limited to 8 levels/);
  assert.throws(
    () =>
      validatePdfBookmarks(
        Array.from({ length: 1_001 }, (_, index) => ({
          title: `Bookmark ${index}`,
          page: 1,
        })),
        1,
      ),
    /at most 1,000 bookmarks/,
  );
  assert.throws(
    () => validatePdfBookmarks([{ title: "x".repeat(241), page: 1 }], 1),
    /limited to 240 characters/,
  );
});

test("invalid export documents fail closed", () => {
  assert.throws(() => parsePdfCpuBookmarkExport("not json", 1), /invalid/);
  assert.throws(() => parsePdfCpuBookmarkExport("[]", 1), /invalid/);
  assert.deepEqual(parsePdfCpuBookmarkExport('{"header":{}}', 1), []);
});

test("import JSON contains only the validated bookmark tree", () => {
  const bookmarks = validatePdfBookmarks(
    [{ title: "One", page: 1, kids: [{ title: "Two", page: 2 }] }],
    2,
  );
  assert.deepEqual(
    JSON.parse(bookmarkImportJson(bookmarks)),
    JSON.parse(JSON.stringify({ bookmarks })),
  );
});

test("bookmark trees flatten for editing and nest without losing styles", () => {
  const tree = validatePdfBookmarks(
    [
      {
        title: "One",
        page: 1,
        bold: true,
        kids: [{ title: "Two", page: 2, italic: true }],
      },
      { title: "Three", page: 3 },
    ],
    3,
  );
  const rows = flattenPdfBookmarks(tree);
  assert.deepEqual(
    rows.map(({ depth, page, title }) => ({ depth, page, title })),
    [
      { depth: 0, page: 1, title: "One" },
      { depth: 1, page: 2, title: "Two" },
      { depth: 0, page: 3, title: "Three" },
    ],
  );
  assert.deepEqual(nestPdfBookmarkRows(rows, 3), tree);
});

test("invalid first-row and skipped-level indentation are rejected", () => {
  const base = {
    id: "one",
    title: "One",
    page: 1,
    bold: undefined,
    italic: undefined,
    color: undefined,
  };
  assert.throws(
    () => nestPdfBookmarkRows([{ ...base, depth: 1 }], 1),
    /indentation is invalid/,
  );
  assert.throws(
    () =>
      nestPdfBookmarkRows(
        [
          { ...base, depth: 0 },
          { ...base, id: "two", depth: 2 },
        ],
        1,
      ),
    /indentation is invalid/,
  );
});
