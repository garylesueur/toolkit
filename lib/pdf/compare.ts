import type { PDFDocumentProxy } from "pdfjs-dist";

import { comparePixels } from "./compare-options.ts";
import type { PixelImage } from "./compare-options.ts";

export type PdfPageComparison = {
  changedPixels: number;
  diffUrl: string;
  height: number;
  leftUrl: string;
  meanDelta: number;
  pageNumber: number;
  percentChanged: number;
  rightUrl: string;
  totalPixels: number;
  width: number;
};

let pdfjsLib: typeof import("pdfjs-dist") | null = null;

async function getPdfjs() {
  if (!pdfjsLib) {
    pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }
  return pdfjsLib;
}

async function renderPage(
  pdf: PDFDocumentProxy,
  pageIndex: number,
  scale: number,
): Promise<PixelImage> {
  const page = await pdf.getPage(pageIndex + 1);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext: context, viewport }).promise;
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  return { data: image.data, height: image.height, width: image.width };
}

function imageUrl(image: PixelImage | null, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  if (image) {
    const imageData = context.createImageData(image.width, image.height);
    imageData.data.set(image.data);
    context.putImageData(imageData, 0, 0);
  }
  return canvas.toDataURL("image/png");
}

export async function comparePdfDocuments(
  leftBytes: Uint8Array,
  rightBytes: Uint8Array,
  threshold = 24,
  scale = 0.8,
  onProgress?: (completed: number, total: number) => void,
): Promise<PdfPageComparison[]> {
  if (!Number.isFinite(scale) || scale < 0.25 || scale > 2) {
    throw new Error("Comparison scale must be between 0.25 and 2.");
  }
  const pdfjs = await getPdfjs();
  const left = await pdfjs.getDocument({ data: leftBytes.slice() }).promise;
  const right = await pdfjs.getDocument({ data: rightBytes.slice() }).promise;
  try {
    const total = Math.max(left.numPages, right.numPages);
    const results: PdfPageComparison[] = [];
    for (let index = 0; index < total; index++) {
      const leftImage =
        index < left.numPages ? await renderPage(left, index, scale) : null;
      const rightImage =
        index < right.numPages ? await renderPage(right, index, scale) : null;
      const difference = comparePixels(leftImage, rightImage, threshold);
      results.push({
        changedPixels: difference.changedPixels,
        diffUrl: imageUrl(difference, difference.width, difference.height),
        height: difference.height,
        leftUrl: imageUrl(leftImage, difference.width, difference.height),
        meanDelta: difference.meanDelta,
        pageNumber: index + 1,
        percentChanged: difference.percentChanged,
        rightUrl: imageUrl(rightImage, difference.width, difference.height),
        totalPixels: difference.totalPixels,
        width: difference.width,
      });
      onProgress?.(index + 1, total);
    }
    return results;
  } finally {
    await Promise.all([
      left.loadingTask.destroy(),
      right.loadingTask.destroy(),
    ]);
  }
}
