import { PDFDocument } from "pdf-lib"

/** Create a new PDF containing only the specified pages. indicesToExtract is 0-based. */
export async function extractPdfPages(
  sourceBytes: Uint8Array,
  indicesToExtract: number[],
): Promise<PDFDocument> {
  if (indicesToExtract.length === 0) {
    throw new Error("No pages selected.")
  }

  const source = await PDFDocument.load(sourceBytes)
  const result = await PDFDocument.create()

  const copiedPages = await result.copyPages(source, indicesToExtract)
  for (const page of copiedPages) {
    result.addPage(page)
  }

  return result
}
