export const PDF_IMAGE_SCALES = [1, 1.5, 2, 3] as const;
export const MAX_CANVAS_PIXELS = 40_000_000;

export type PdfImageFormat = "png" | "jpeg";
export type PdfImageScale = (typeof PDF_IMAGE_SCALES)[number];

export function imageMimeType(
  format: PdfImageFormat,
): "image/png" | "image/jpeg" {
  return format === "png" ? "image/png" : "image/jpeg";
}

export function imageExtension(format: PdfImageFormat): "png" | "jpg" {
  return format === "png" ? "png" : "jpg";
}

export function pdfBaseName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.pdf$/i, "").trim();
  return withoutExtension || "document";
}

export function outputImageName(
  baseName: string,
  pageNumber: number,
  totalPages: number,
  format: PdfImageFormat,
): string {
  const digits = Math.max(2, String(totalPages).length);
  return `${pdfBaseName(baseName)}-page-${String(pageNumber).padStart(digits, "0")}.${imageExtension(format)}`;
}

export function resolvePageNumbers(
  selectedZeroBasedPages: number[],
  totalPages: number,
): number[] {
  if (!Number.isInteger(totalPages) || totalPages < 1) {
    throw new Error("The PDF has no exportable pages.");
  }

  if (selectedZeroBasedPages.length === 0) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = [...new Set(selectedZeroBasedPages)]
    .sort((a, b) => a - b)
    .map((index) => index + 1);

  if (pages.some((page) => page < 1 || page > totalPages)) {
    throw new Error(`Selected pages must be between 1 and ${totalPages}.`);
  }

  return pages;
}

export function validateCanvasSize(
  width: number,
  height: number,
  maxPixels = MAX_CANVAS_PIXELS,
): { width: number; height: number; pixels: number } {
  const roundedWidth = Math.ceil(width);
  const roundedHeight = Math.ceil(height);
  const pixels = roundedWidth * roundedHeight;

  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    roundedWidth < 1 ||
    roundedHeight < 1
  ) {
    throw new Error("The page has invalid dimensions.");
  }

  if (pixels > maxPixels) {
    throw new Error(
      `This page would create a ${roundedWidth}×${roundedHeight} image. Choose a lower resolution.`,
    );
  }

  return { width: roundedWidth, height: roundedHeight, pixels };
}
