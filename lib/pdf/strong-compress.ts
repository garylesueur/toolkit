import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";

import { assembleCompressedPdf } from "./strong-compress-assemble";
import type { CompressedPageImage } from "./strong-compress-assemble";
import {
  compressionSavings,
  dpiToPdfScale,
  strongCompressionSettings,
} from "./strong-compress-options";
import type { StrongCompressionPreset } from "./strong-compress-options";
import { validateCanvasSize } from "./to-images-options";

let pdfjsLib: typeof import("pdfjs-dist") | null = null;

async function getPdfjs() {
  if (!pdfjsLib) {
    pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }
  return pdfjsLib;
}

export type StrongCompressStage =
  | "loading-document"
  | "rendering"
  | "assembling"
  | "verifying";

export type StrongCompressProgress = {
  stage: StrongCompressStage;
  completed: number;
  total: number;
  pageNumber?: number;
};

export type StrongCompressResult = {
  bytes: Uint8Array;
  originalSize: number;
  compressedSize: number;
  savedSize: number;
  savedPercent: number;
  usedOriginal: boolean;
  flattened: boolean;
  preset: StrongCompressionPreset;
};

export type StrongCompressOptions = {
  preset: StrongCompressionPreset;
  signal?: AbortSignal;
};

function abortError(): DOMException {
  return new DOMException("Strong PDF compression cancelled.", "AbortError");
}

function canvasToJpeg(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          reject(new Error("The browser could not encode a compressed page."));
          return;
        }
        resolve(new Uint8Array(await blob.arrayBuffer()));
      },
      "image/jpeg",
      quality,
    );
  });
}

async function renderCompressedPage(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  scale: number,
  quality: number,
  signal?: AbortSignal,
): Promise<CompressedPageImage> {
  if (signal?.aborted) throw abortError();
  const page = await pdf.getPage(pageNumber);
  let canvas: HTMLCanvasElement | null = null;
  let renderTask: RenderTask | null = null;
  const cancelRender = () => renderTask?.cancel();

  try {
    const viewport = page.getViewport({ scale });
    const naturalViewport = page.getViewport({ scale: 1 });
    const dimensions = validateCanvasSize(viewport.width, viewport.height);
    canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Could not create a compression canvas.");

    signal?.addEventListener("abort", cancelRender, { once: true });
    renderTask = page.render({
      canvas,
      canvasContext: context,
      viewport,
      background: "#ffffff",
    });
    await renderTask.promise;
    if (signal?.aborted) throw abortError();

    return {
      jpegBytes: await canvasToJpeg(canvas, quality),
      pageWidth: naturalViewport.width,
      pageHeight: naturalViewport.height,
    };
  } catch (error) {
    if (signal?.aborted) throw abortError();
    throw error;
  } finally {
    signal?.removeEventListener("abort", cancelRender);
    page.cleanup();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}

export async function strongCompressPdf(
  source: Uint8Array,
  options: StrongCompressOptions,
  onProgress?: (progress: StrongCompressProgress) => void,
): Promise<StrongCompressResult> {
  if (!source.byteLength) throw new Error("Choose a non-empty PDF first.");
  const settings = strongCompressionSettings(options.preset);
  const scale = dpiToPdfScale(settings.dpi);
  if (options.signal?.aborted) throw abortError();

  onProgress?.({ stage: "loading-document", completed: 0, total: 0 });
  const pdfjs = await getPdfjs();
  const loadingTask = pdfjs.getDocument({ data: source.slice() });
  const pdf = await loadingTask.promise;

  try {
    const renderedPages: CompressedPageImage[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      if (options.signal?.aborted) throw abortError();
      renderedPages.push(
        await renderCompressedPage(
          pdf,
          pageNumber,
          scale,
          settings.jpegQuality,
          options.signal,
        ),
      );
      onProgress?.({
        stage: "rendering",
        completed: pageNumber,
        total: pdf.numPages,
        pageNumber,
      });
    }

    if (options.signal?.aborted) throw abortError();
    onProgress?.({
      stage: "assembling",
      completed: pdf.numPages,
      total: pdf.numPages,
    });
    const flattenedBytes = await assembleCompressedPdf(renderedPages);
    onProgress?.({
      stage: "verifying",
      completed: pdf.numPages,
      total: pdf.numPages,
    });
    const savings = compressionSavings(
      source.byteLength,
      flattenedBytes.byteLength,
    );
    const bytes = savings.useOriginal ? source.slice() : flattenedBytes;

    return {
      bytes,
      originalSize: source.byteLength,
      compressedSize: bytes.byteLength,
      savedSize: savings.savedSize,
      savedPercent: savings.savedPercent,
      usedOriginal: savings.useOriginal,
      flattened: !savings.useOriginal,
      preset: options.preset,
    };
  } finally {
    await loadingTask.destroy();
  }
}
