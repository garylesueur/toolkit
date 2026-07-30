import { PDFDocument } from "pdf-lib";

import { loadPdfBytes } from "./load";

/** Create a new PDF with pages in the given order. newOrder is an array of 0-based source page indices. */
export async function rearrangePdfPages(
  sourceBytes: Uint8Array,
  newOrder: number[],
): Promise<PDFDocument> {
  const source = await loadPdfBytes(sourceBytes);
  const result = await PDFDocument.create();

  const copiedPages = await result.copyPages(source, newOrder);
  for (const page of copiedPages) {
    result.addPage(page);
  }

  return result;
}
