import type { PDFDocumentProxy } from "pdfjs-dist"

let pdfjsLib: typeof import("pdfjs-dist") | null = null

async function getPdfjs() {
  if (!pdfjsLib) {
    pdfjsLib = await import("pdfjs-dist")
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"
  }
  return pdfjsLib
}

/** Render a single page to a data-URL thumbnail. pageIndex is 0-based. */
export async function renderPageThumbnail(
  source: Uint8Array | PDFDocumentProxy,
  pageIndex: number,
  scale = 0.4,
): Promise<string> {
  let pdf: PDFDocumentProxy

  if (source instanceof Uint8Array) {
    const pdfjs = await getPdfjs()
    pdf = await pdfjs.getDocument({ data: source }).promise
  } else {
    pdf = source
  }

  const page = await pdf.getPage(pageIndex + 1) // PDF.js uses 1-based
  const viewport = page.getViewport({ scale })

  const canvas = document.createElement("canvas")
  canvas.width = viewport.width
  canvas.height = viewport.height

  await page.render({
    canvasContext: canvas.getContext("2d")!,
    viewport,
    canvas,
  }).promise

  return canvas.toDataURL("image/png")
}

/** Render thumbnails for all pages. */
export async function renderAllThumbnails(
  bytes: Uint8Array,
  scale = 0.4,
): Promise<string[]> {
  const pdfjs = await getPdfjs()
  const pdf = await pdfjs.getDocument({ data: bytes }).promise
  const results: string[] = []

  for (let i = 0; i < pdf.numPages; i++) {
    results.push(await renderPageThumbnail(pdf, i, scale))
  }

  return results
}
