import { parsePageRanges } from "./page-ranges.ts";

export const MAX_IMAGE_EXTRACTION_PAGES = 100;
export const MAX_EXTRACTED_IMAGES = 500;
export const MAX_EXTRACTED_IMAGE_BYTES = 512 * 1024 * 1024;

const MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  gif: "image/gif",
  jbig2: "image/x-jbig2",
  jp2: "image/jp2",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  jpx: "image/jp2",
  png: "image/png",
  tif: "image/tiff",
  tiff: "image/tiff",
  webp: "image/webp",
};

const PREVIEWABLE_MIME_TYPES = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export type ExtractedImageMetadata = {
  name: string;
  mimeType: string;
  previewable: boolean;
};

export function resolveImageExtractionPages(
  value: string,
  pageCount: number,
): number[] {
  const parsed = parsePageRanges(value, pageCount);
  if (parsed.error) throw new Error(parsed.error);
  const pages = parsed.pages.length
    ? parsed.pages.map((pageIndex) => pageIndex + 1)
    : Array.from({ length: pageCount }, (_, index) => index + 1);
  if (pages.length > MAX_IMAGE_EXTRACTION_PAGES) {
    throw new Error(
      `Extract images from at most ${MAX_IMAGE_EXTRACTION_PAGES} pages at a time.`,
    );
  }
  return pages;
}

export function buildImageExtractionArguments(pages: number[]): string[] {
  if (!pages.length) throw new Error("Select at least one PDF page.");
  if (
    pages.length > MAX_IMAGE_EXTRACTION_PAGES ||
    pages.some((page) => !Number.isInteger(page) || page < 1)
  ) {
    throw new Error("The image extraction page selection is invalid.");
  }
  return [
    "pdfcpu",
    "images",
    "extract",
    "--conf",
    "disable",
    "--offline",
    "--pages",
    [...new Set(pages)].sort((a, b) => a - b).join(","),
    "/input.pdf",
    "/images",
  ];
}

export function extractedImageMetadata(name: string): ExtractedImageMetadata {
  const baseName = name.split(/[\\/]/).at(-1) ?? "";
  const withoutControls = Array.from(baseName, (character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127 ? "_" : character;
  }).join("");
  const safeName =
    withoutControls.replace(/[<>:"|?*]/g, "_") || "extracted-image";
  const extension = safeName.split(".").at(-1)?.toLowerCase() ?? "";
  const mimeType = MIME_BY_EXTENSION[extension] ?? "application/octet-stream";
  return {
    name: safeName,
    mimeType,
    previewable: PREVIEWABLE_MIME_TYPES.has(mimeType),
  };
}

export function sortExtractedImageNames(names: string[]): string[] {
  return [...names].sort((left, right) =>
    left.localeCompare(right, "en", { numeric: true, sensitivity: "base" }),
  );
}
