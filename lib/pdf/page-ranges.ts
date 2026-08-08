export type PageRangeResult = {
  pages: number[];
  error: string | null;
};

/** Parse a range string like "1-3, 5, 7-10" into 0-based page indices. */
export function parsePageRanges(
  input: string,
  totalPages: number,
): PageRangeResult {
  const trimmed = input.trim();
  if (!trimmed) return { pages: [], error: null };

  const pages = new Set<number>();
  const parts = trimmed.split(",");

  for (const part of parts) {
    const range = part.trim();
    if (!range) continue;

    const match = range.match(/^(\d+)\s*-\s*(\d+)$/);
    if (match) {
      const start = parseInt(match[1], 10);
      const end = parseInt(match[2], 10);
      if (start < 1 || end > totalPages || start > end) {
        return {
          pages: [],
          error: `Invalid range "${range}" — pages go from 1 to ${totalPages}.`,
        };
      }
      for (let page = start; page <= end; page++) pages.add(page - 1);
    } else if (/^\d+$/.test(range)) {
      const page = parseInt(range, 10);
      if (page < 1 || page > totalPages) {
        return {
          pages: [],
          error: `Page ${page} is out of range (1–${totalPages}).`,
        };
      }
      pages.add(page - 1);
    } else {
      return { pages: [], error: `Cannot parse "${range}".` };
    }
  }

  return { pages: Array.from(pages).sort((a, b) => a - b), error: null };
}
