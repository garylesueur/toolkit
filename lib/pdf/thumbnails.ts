import type { PDFDocumentProxy } from "pdfjs-dist";

let pdfjsLib: typeof import("pdfjs-dist") | null = null;

async function getPdfjs() {
  if (!pdfjsLib) {
    pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }
  return pdfjsLib;
}

/** Render a single page to a data-URL thumbnail. pageIndex is 0-based. */
export async function renderPageThumbnail(
  source: Uint8Array | PDFDocumentProxy,
  pageIndex: number,
  scale = 0.4,
): Promise<string> {
  let pdf: PDFDocumentProxy;
  // Only destroy a document we opened ourselves; a caller-supplied proxy is
  // still theirs to manage.
  let ownsDocument = false;

  if (source instanceof Uint8Array) {
    const pdfjs = await getPdfjs();
    // PDF.js transfers the supplied typed array to its worker, detaching the
    // original buffer. Keep the caller's bytes reusable for later operations.
    pdf = await pdfjs.getDocument({ data: source.slice() }).promise;
    ownsDocument = true;
  } else {
    pdf = source;
  }

  try {
    const page = await pdf.getPage(pageIndex + 1); // PDF.js uses 1-based
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: canvas.getContext("2d")!,
      viewport,
      canvas,
    }).promise;

    return canvas.toDataURL("image/png");
  } finally {
    if (ownsDocument) await pdf.loadingTask.destroy();
  }
}

/** Render thumbnails for all pages. */
export async function renderAllThumbnails(
  bytes: Uint8Array,
  scale = 0.4,
): Promise<string[]> {
  const pdfjs = await getPdfjs();
  // PDF.js may transfer this buffer to its worker. The hook that owns `bytes`
  // still needs the original for the user's eventual PDF operation.
  const pdf = await pdfjs.getDocument({ data: bytes.slice() }).promise;

  try {
    const results: string[] = [];
    for (let i = 0; i < pdf.numPages; i++) {
      results.push(await renderPageThumbnail(pdf, i, scale));
    }
    return results;
  } finally {
    // Without this the worker holds every document ever opened in the session.
    await pdf.loadingTask.destroy();
  }
}
