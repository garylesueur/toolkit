export type PdfBookmarkOperation = "export" | "import" | "remove";

export type PdfBookmark = {
  bold?: boolean;
  color?: { B: number; G: number; R: number };
  italic?: boolean;
  kids?: PdfBookmark[];
  page: number;
  title: string;
};

export type PdfBookmarkRow = Omit<PdfBookmark, "kids"> & {
  depth: number;
  id: string;
};

export const MAX_PDF_BOOKMARKS = 1_000;
export const MAX_PDF_BOOKMARK_DEPTH = 8;
export const MAX_PDF_BOOKMARK_TITLE = 240;

export function buildBookmarkArguments(
  operation: PdfBookmarkOperation,
): string[] {
  const common = ["--conf", "disable", "--offline"];
  if (operation === "export") {
    return [
      "pdfcpu",
      "bookmarks",
      "export",
      ...common,
      "/input.pdf",
      "/bookmarks.json",
    ];
  }
  if (operation === "import") {
    return [
      "pdfcpu",
      "bookmarks",
      "import",
      "--replace",
      ...common,
      "/input.pdf",
      "/bookmarks.json",
      "/output.pdf",
    ];
  }
  return [
    "pdfcpu",
    "bookmarks",
    "remove",
    ...common,
    "/input.pdf",
    "/output.pdf",
  ];
}

export function isNoBookmarksDiagnostic(log: string): boolean {
  return /(?:^|\s)no bookmarks available(?:\s|$)/i.test(log);
}

function optionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    throw new Error(`Bookmark ${field} must be true or false.`);
  }
  return value;
}

function optionalColor(value: unknown): PdfBookmark["color"] {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Bookmark colours must be RGB objects.");
  }
  const input = value as Record<string, unknown>;
  const color = { R: input.R, G: input.G, B: input.B };
  if (
    Object.values(color).some(
      (channel) =>
        typeof channel !== "number" ||
        !Number.isFinite(channel) ||
        channel < 0 ||
        channel > 1,
    )
  ) {
    throw new Error("Bookmark RGB channels must be numbers from 0 to 1.");
  }
  return color as { B: number; G: number; R: number };
}

export function validatePdfBookmarks(
  value: unknown,
  pageCount: number,
): PdfBookmark[] {
  if (!Number.isInteger(pageCount) || pageCount < 1) {
    throw new Error("The PDF has no pages for bookmarks.");
  }
  if (!Array.isArray(value)) throw new Error("Bookmarks must be a JSON array.");
  let total = 0;

  const visit = (items: unknown[], depth: number): PdfBookmark[] => {
    if (depth > MAX_PDF_BOOKMARK_DEPTH) {
      throw new Error(
        `Bookmark nesting is limited to ${MAX_PDF_BOOKMARK_DEPTH} levels.`,
      );
    }
    return items.map((item) => {
      total += 1;
      if (total > MAX_PDF_BOOKMARKS) {
        throw new Error(
          `Use at most ${MAX_PDF_BOOKMARKS.toLocaleString("en")} bookmarks.`,
        );
      }
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        throw new Error("Each bookmark must be a JSON object.");
      }
      const input = item as Record<string, unknown>;
      const title = typeof input.title === "string" ? input.title.trim() : "";
      if (!title) throw new Error("Every bookmark needs a title.");
      if (title.length > MAX_PDF_BOOKMARK_TITLE) {
        throw new Error(
          `Bookmark titles are limited to ${MAX_PDF_BOOKMARK_TITLE} characters.`,
        );
      }
      if (
        !Number.isInteger(input.page) ||
        (input.page as number) < 1 ||
        (input.page as number) > pageCount
      ) {
        throw new Error(`Bookmark “${title}” points outside this PDF.`);
      }
      const kids =
        input.kids === undefined
          ? undefined
          : Array.isArray(input.kids)
            ? visit(input.kids, depth + 1)
            : (() => {
                throw new Error(`Bookmark “${title}” has invalid children.`);
              })();
      return {
        title,
        page: input.page as number,
        bold: optionalBoolean(input.bold, "bold"),
        italic: optionalBoolean(input.italic, "italic"),
        color: optionalColor(input.color),
        ...(kids?.length ? { kids } : {}),
      };
    });
  };

  return visit(value, 1);
}

export function parsePdfCpuBookmarkExport(
  json: string,
  pageCount: number,
): PdfBookmark[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("pdfcpu returned invalid bookmark JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("pdfcpu returned an invalid bookmark document.");
  }
  const bookmarks = (parsed as Record<string, unknown>).bookmarks;
  return validatePdfBookmarks(bookmarks ?? [], pageCount);
}

export function bookmarkImportJson(bookmarks: PdfBookmark[]): string {
  return JSON.stringify({ bookmarks }, null, 2);
}

export function countPdfBookmarks(bookmarks: PdfBookmark[]): number {
  return bookmarks.reduce(
    (total, bookmark) => total + 1 + countPdfBookmarks(bookmark.kids ?? []),
    0,
  );
}

export function flattenPdfBookmarks(
  bookmarks: PdfBookmark[],
): PdfBookmarkRow[] {
  const rows: PdfBookmarkRow[] = [];
  const visit = (items: PdfBookmark[], depth: number, prefix: string) => {
    for (const [index, bookmark] of items.entries()) {
      const { kids, ...row } = bookmark;
      const id = `${prefix}${index}`;
      rows.push({ ...row, depth, id });
      if (kids?.length) visit(kids, depth + 1, `${id}.`);
    }
  };
  visit(bookmarks, 0, "bookmark-");
  return rows;
}

export function nestPdfBookmarkRows(
  rows: PdfBookmarkRow[],
  pageCount: number,
): PdfBookmark[] {
  const roots: PdfBookmark[] = [];
  const parents: PdfBookmark[] = [];
  let previousDepth = 0;
  for (const [index, row] of rows.entries()) {
    if (
      !Number.isInteger(row.depth) ||
      row.depth < 0 ||
      row.depth >= MAX_PDF_BOOKMARK_DEPTH ||
      (index === 0 && row.depth !== 0) ||
      (index > 0 && row.depth > previousDepth + 1)
    ) {
      throw new Error("Bookmark indentation is invalid.");
    }
    const { depth, id: _id, ...bookmark } = row;
    const node: PdfBookmark = { ...bookmark };
    if (depth === 0) {
      roots.push(node);
    } else {
      const parent = parents[depth - 1];
      if (!parent) throw new Error("Bookmark indentation is invalid.");
      parent.kids ??= [];
      parent.kids.push(node);
    }
    parents[depth] = node;
    parents.length = depth + 1;
    previousDepth = depth;
  }
  return validatePdfBookmarks(roots, pageCount);
}
