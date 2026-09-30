export type PageNumberFormat = "number" | "page" | "fraction";
export type PageNumberPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export function formatPageNumber(
  value: number,
  finalValue: number,
  format: PageNumberFormat,
): string {
  if (format === "page") return `Page ${value}`;
  if (format === "fraction") return `${value} / ${finalValue}`;
  return String(value);
}

export function pageNumberPoint(
  pageWidth: number,
  pageHeight: number,
  textWidth: number,
  fontSize: number,
  margin: number,
  position: PageNumberPosition,
): { x: number; y: number } {
  const horizontal = position.split("-")[1];
  const x =
    horizontal === "left"
      ? margin
      : horizontal === "right"
        ? pageWidth - margin - textWidth
        : (pageWidth - textWidth) / 2;
  const y = position.startsWith("top")
    ? pageHeight - margin - fontSize
    : margin;

  return { x: Math.max(0, x), y: Math.max(0, y) };
}

export function numberedPageIndices(
  selectedPages: number[],
  totalPages: number,
): number[] {
  if (totalPages < 1) throw new Error("The PDF has no pages.");
  if (selectedPages.length === 0) {
    return Array.from({ length: totalPages }, (_, index) => index);
  }

  const pages = [...new Set(selectedPages)].sort((a, b) => a - b);
  if (pages.some((page) => page < 0 || page >= totalPages)) {
    throw new Error(`Selected pages must be between 1 and ${totalPages}.`);
  }
  return pages;
}
