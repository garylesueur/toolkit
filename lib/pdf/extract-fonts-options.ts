import {
  resolveResourceExtractionPages,
  safeExtractedResourceName,
  sortExtractedImageNames,
} from "./extract-images-options.ts";

export const MAX_FONT_EXTRACTION_PAGES = 100;

export type ExtractedFontMetadata = {
  name: string;
  mimeType: "font/ttf";
  subset: boolean;
};

export function resolveFontExtractionPages(
  value: string,
  pageCount: number,
): number[] {
  return resolveResourceExtractionPages("font", value, pageCount);
}

export function trueTypeGlyphCount(bytes: Uint8Array): number | null {
  if (bytes.byteLength < 12) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tableCount = view.getUint16(4);
  if (12 + tableCount * 16 > bytes.byteLength) return null;

  for (let index = 0; index < tableCount; index += 1) {
    const recordOffset = 12 + index * 16;
    const tag = String.fromCharCode(
      bytes[recordOffset],
      bytes[recordOffset + 1],
      bytes[recordOffset + 2],
      bytes[recordOffset + 3],
    );
    if (tag !== "maxp") continue;
    const tableOffset = view.getUint32(recordOffset + 8);
    if (tableOffset + 6 > bytes.byteLength) return null;
    return view.getUint16(tableOffset + 4);
  }
  return null;
}

export function extractedFontMetadata(
  name: string,
  bytes?: Uint8Array,
): ExtractedFontMetadata {
  const safeName = safeExtractedResourceName(name);
  const glyphCount = bytes ? trueTypeGlyphCount(bytes) : null;
  return {
    name: safeName,
    mimeType: "font/ttf",
    subset:
      /(?:^|[_-])[A-Z]{6}\+/.test(safeName) ||
      (glyphCount !== null && glyphCount <= 512),
  };
}

export function sortExtractedFontNames(names: string[]): string[] {
  return sortExtractedImageNames(names);
}
