import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";

import {
  imageMimeType,
  outputImageName,
  pdfBaseName,
  resolvePageNumbers,
  validateCanvasSize,
} from "./to-images-options";
import type { PdfImageFormat, PdfImageScale } from "./to-images-options";

let pdfjsLib: typeof import("pdfjs-dist") | null = null;

async function getPdfjs() {
  if (!pdfjsLib) {
    pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }
  return pdfjsLib;
}

export type PdfImageResult = {
  blob: Blob;
  height: number;
  name: string;
  pageNumber: number;
  width: number;
};

export type PdfToImagesOptions = {
  fileName: string;
  format: PdfImageFormat;
  jpegQuality: number;
  pages: number[];
  scale: PdfImageScale;
  signal?: AbortSignal;
};

function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: PdfImageFormat,
  jpegQuality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("The browser could not encode this page."));
      },
      imageMimeType(format),
      format === "jpeg" ? jpegQuality : undefined,
    );
  });
}

function abortError(): DOMException {
  return new DOMException("PDF export cancelled.", "AbortError");
}

async function renderPage(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  totalPages: number,
  options: PdfToImagesOptions,
): Promise<PdfImageResult> {
  if (options.signal?.aborted) throw abortError();

  const page = await pdf.getPage(pageNumber);
  let canvas: HTMLCanvasElement | null = null;
  let renderTask: RenderTask | null = null;
  const cancelRender = () => renderTask?.cancel();

  try {
    if (options.signal?.aborted) throw abortError();
    const viewport = page.getViewport({ scale: options.scale });
    const dimensions = validateCanvasSize(viewport.width, viewport.height);
    canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not create an image canvas.");

    options.signal?.addEventListener("abort", cancelRender, { once: true });
    renderTask = page.render({
      canvas,
      canvasContext: context,
      viewport,
      background: options.format === "jpeg" ? "#ffffff" : undefined,
    });
    await renderTask.promise;
    if (options.signal?.aborted) throw abortError();
    const blob = await canvasToBlob(
      canvas,
      options.format,
      options.jpegQuality,
    );

    return {
      blob,
      height: dimensions.height,
      name: outputImageName(
        pdfBaseName(options.fileName),
        pageNumber,
        totalPages,
        options.format,
      ),
      pageNumber,
      width: dimensions.width,
    };
  } catch (error) {
    if (options.signal?.aborted) throw abortError();
    throw error;
  } finally {
    options.signal?.removeEventListener("abort", cancelRender);
    page.cleanup();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}

export async function pdfToImages(
  bytes: Uint8Array,
  options: PdfToImagesOptions,
  onProgress?: (completed: number, total: number, pageNumber: number) => void,
): Promise<PdfImageResult[]> {
  const pdfjs = await getPdfjs();
  const loadingTask = pdfjs.getDocument({ data: bytes.slice() });
  const pdf = await loadingTask.promise;

  try {
    const pageNumbers = resolvePageNumbers(options.pages, pdf.numPages);
    const results: PdfImageResult[] = [];

    for (let index = 0; index < pageNumbers.length; index++) {
      const pageNumber = pageNumbers[index];
      results.push(await renderPage(pdf, pageNumber, pdf.numPages, options));
      onProgress?.(index + 1, pageNumbers.length, pageNumber);
    }

    return results;
  } finally {
    await loadingTask.destroy();
  }
}
