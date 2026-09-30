import { parsePageRanges } from "./page-ranges.ts";

export const OCR_DPI = 150;
export const MAX_OCR_PAGES = 50;

export type OcrWordBox = {
  text: string;
  confidence: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

export type OcrPageText = {
  pageNumber: number;
  text: string;
  confidence: number | null;
  wordCount: number;
  skipped: boolean;
};

export function resolveOcrPages(input: string, totalPages: number): number[] {
  if (!Number.isInteger(totalPages) || totalPages < 1) {
    throw new Error("The PDF has no pages to recognise.");
  }
  const parsed = parsePageRanges(input, totalPages);
  if (parsed.error) throw new Error(parsed.error);
  const pages = parsed.pages.length
    ? parsed.pages
    : Array.from({ length: totalPages }, (_, index) => index);
  if (pages.length > MAX_OCR_PAGES) {
    throw new Error(
      `Choose at most ${MAX_OCR_PAGES} pages per OCR run to keep browser memory bounded.`,
    );
  }
  return pages;
}

export function hasMeaningfulPdfText(items: Array<{ str?: string }>): boolean {
  return items.some((item) => (item.str ?? "").replace(/\s/g, "").length >= 3);
}

export function searchableWordText(input: string): string {
  return input
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/•/g, "*")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
}

export function ocrWordPlacement(
  word: OcrWordBox,
  canvasWidth: number,
  canvasHeight: number,
  pageWidth: number,
  pageHeight: number,
): { x: number; y: number; size: number } {
  const dimensions = [canvasWidth, canvasHeight, pageWidth, pageHeight];
  if (
    dimensions.some((value) => !Number.isFinite(value) || value <= 0) ||
    [word.x0, word.y0, word.x1, word.y1].some(
      (value) => !Number.isFinite(value),
    ) ||
    word.x1 <= word.x0 ||
    word.y1 <= word.y0
  ) {
    throw new Error("OCR returned an invalid word position.");
  }
  const x = (word.x0 / canvasWidth) * pageWidth;
  const y = pageHeight - (word.y1 / canvasHeight) * pageHeight;
  const height = ((word.y1 - word.y0) / canvasHeight) * pageHeight;
  return {
    x: Math.max(0, Math.min(pageWidth, x)),
    y: Math.max(0, Math.min(pageHeight, y)),
    size: Math.max(3, Math.min(72, height * 0.9)),
  };
}

export function combineOcrText(pages: OcrPageText[]): string {
  return pages
    .map((page) => {
      const content = page.skipped
        ? "[Skipped: an existing text layer was detected]"
        : page.text.trim() || "[No text recognised]";
      return `--- Page ${page.pageNumber} ---\n${content}`;
    })
    .join("\n\n");
}
