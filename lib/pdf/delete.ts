import { PDFDocument } from "pdf-lib"

/** Create a new PDF with the specified pages removed. indicesToDelete is a Set of 0-based page indices. */
export async function deletePdfPages(
  sourceBytes: Uint8Array,
  indicesToDelete: Set<number>,
): Promise<PDFDocument> {
  const source = await PDFDocument.load(sourceBytes)
  const result = await PDFDocument.create()
  const totalPages = source.getPageCount()

  const indicesToKeep = Array.from(
    { length: totalPages },
    (_, i) => i,
  ).filter((i) => !indicesToDelete.has(i))

  if (indicesToKeep.length === 0) {
    throw new Error("Cannot delete all pages.")
  }

  const copiedPages = await result.copyPages(source, indicesToKeep)
  for (const page of copiedPages) {
    result.addPage(page)
  }

  return result
}
