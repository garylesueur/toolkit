import { PDFDocument } from "pdf-lib"

export type SplitResult = {
  name: string
  bytes: Uint8Array
}

/** Split a PDF into individual pages. */
export async function splitPdfByPages(
  sourceBytes: Uint8Array,
  baseName: string,
): Promise<SplitResult[]> {
  const source = await PDFDocument.load(sourceBytes)
  const results: SplitResult[] = []

  for (let i = 0; i < source.getPageCount(); i++) {
    const doc = await PDFDocument.create()
    const [page] = await doc.copyPages(source, [i])
    doc.addPage(page)
    const bytes = await doc.save()
    results.push({
      name: `${baseName}-page-${i + 1}.pdf`,
      bytes: new Uint8Array(bytes),
    })
  }

  return results
}

/** Split a PDF by ranges. Each range is an array of 0-based page indices. */
export async function splitPdfByRanges(
  sourceBytes: Uint8Array,
  ranges: number[][],
  baseName: string,
): Promise<SplitResult[]> {
  const source = await PDFDocument.load(sourceBytes)
  const results: SplitResult[] = []

  for (let r = 0; r < ranges.length; r++) {
    const doc = await PDFDocument.create()
    const copiedPages = await doc.copyPages(source, ranges[r])
    for (const page of copiedPages) {
      doc.addPage(page)
    }
    const bytes = await doc.save()
    const rangeLabel = ranges[r].length === 1
      ? `page-${ranges[r][0] + 1}`
      : `pages-${ranges[r][0] + 1}-${ranges[r][ranges[r].length - 1] + 1}`
    results.push({
      name: `${baseName}-${rangeLabel}.pdf`,
      bytes: new Uint8Array(bytes),
    })
  }

  return results
}
