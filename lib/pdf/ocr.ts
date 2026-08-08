import { PDFDocument, StandardFonts } from "pdf-lib";
import type { PDFPageProxy, RenderTask } from "pdfjs-dist";

import {
  OCR_DPI,
  combineOcrText,
  hasMeaningfulPdfText,
  ocrWordPlacement,
  resolveOcrPages,
  searchableWordText,
} from "./ocr-options.ts";
import type { OcrPageText, OcrWordBox } from "./ocr-options.ts";
import { dpiToPdfScale } from "./strong-compress-options.ts";
import { validateCanvasSize } from "./to-images-options.ts";

let pdfjsLib: typeof import("pdfjs-dist") | null = null;

async function getPdfjs() {
  if (!pdfjsLib) {
    pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }
  return pdfjsLib;
}

export type OcrStage =
  | "loading-document"
  | "loading-engine"
  | "recognising"
  | "assembling";

export type OcrProgress = {
  stage: OcrStage;
  completed: number;
  total: number;
  pageNumber?: number;
  engineStatus?: string;
  engineProgress?: number;
};

export type PdfOcrOptions = {
  pages: string;
  skipTextPages: boolean;
  createSearchablePdf: boolean;
  signal?: AbortSignal;
};

type RecognisedPage = OcrPageText & {
  pageIndex: number;
  canvasWidth: number;
  canvasHeight: number;
  words: OcrWordBox[];
};

export type PdfOcrResult = {
  pages: OcrPageText[];
  text: string;
  searchablePdf: Uint8Array | null;
  recognisedPages: number;
  skippedPages: number;
  averageConfidence: number | null;
};

function abortError(): DOMException {
  return new DOMException("PDF OCR cancelled.", "AbortError");
}

export function raceWithOcrAbort<T>(
  operation: Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (!signal) return operation;
  if (signal.aborted) return Promise.reject(abortError());

  return new Promise<T>((resolve, reject) => {
    const cancel = () => {
      signal.removeEventListener("abort", cancel);
      reject(abortError());
    };
    signal.addEventListener("abort", cancel, { once: true });
    operation.then(
      (value) => {
        signal.removeEventListener("abort", cancel);
        resolve(value);
      },
      (cause) => {
        signal.removeEventListener("abort", cancel);
        reject(cause);
      },
    );
  });
}

function flattenWords(
  blocks: NonNullable<Tesseract.Page["blocks"]>,
): OcrWordBox[] {
  return blocks.flatMap((block) =>
    block.paragraphs.flatMap((paragraph) =>
      paragraph.lines.flatMap((line) =>
        line.words.map((word) => ({
          text: word.text,
          confidence: word.confidence,
          x0: word.bbox.x0,
          y0: word.bbox.y0,
          x1: word.bbox.x1,
          y1: word.bbox.y1,
        })),
      ),
    ),
  );
}

async function renderOcrCanvas(
  page: PDFPageProxy,
  signal?: AbortSignal,
): Promise<{ canvas: HTMLCanvasElement; renderTask: RenderTask }> {
  const viewport = page.getViewport({ scale: dpiToPdfScale(OCR_DPI) });
  const dimensions = validateCanvasSize(viewport.width, viewport.height);
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Could not create an OCR page canvas.");
  const renderTask = page.render({
    canvas,
    canvasContext: context,
    viewport,
    background: "#ffffff",
  });
  const cancel = () => renderTask.cancel();
  signal?.addEventListener("abort", cancel, { once: true });
  try {
    await renderTask.promise;
    if (signal?.aborted) throw abortError();
    return { canvas, renderTask };
  } catch (cause) {
    canvas.width = 0;
    canvas.height = 0;
    if (signal?.aborted) throw abortError();
    throw cause;
  } finally {
    signal?.removeEventListener("abort", cancel);
  }
}

export async function buildSearchableOcrPdf(
  source: Uint8Array,
  recognised: RecognisedPage[],
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(source, { updateMetadata: false });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (const result of recognised) {
    if (result.skipped || !result.words.length) continue;
    const page = pdf.getPage(result.pageIndex);
    const { width, height } = page.getSize();
    for (const word of result.words) {
      const text = searchableWordText(word.text);
      if (!text) continue;
      const placement = ocrWordPlacement(
        word,
        result.canvasWidth,
        result.canvasHeight,
        width,
        height,
      );
      page.drawText(text, {
        x: placement.x,
        y: placement.y,
        size: placement.size,
        font,
        opacity: 0,
      });
    }
  }
  pdf.setProducer("Le Sueur Toolkit browser OCR");
  return pdf.save({ useObjectStreams: true });
}

export async function recognisePdf(
  source: Uint8Array,
  options: PdfOcrOptions,
  onProgress?: (progress: OcrProgress) => void,
): Promise<PdfOcrResult> {
  if (!source.byteLength) throw new Error("Choose a non-empty PDF first.");
  if (options.signal?.aborted) throw abortError();
  onProgress?.({ stage: "loading-document", completed: 0, total: 0 });
  const pdfjs = await getPdfjs();
  const loadingTask = pdfjs.getDocument({ data: source.slice() });
  const document = await loadingTask.promise;
  const selectedPages = resolveOcrPages(options.pages, document.numPages);
  let currentPageNumber: number | undefined;
  let completed = 0;
  let worker: Awaited<
    ReturnType<(typeof import("tesseract.js"))["createWorker"]>
  > | null = null;
  let termination: Promise<unknown> | null = null;
  const terminate = () => {
    if (worker && !termination) {
      termination = worker.terminate().catch(() => undefined);
    }
  };
  options.signal?.addEventListener("abort", terminate, { once: true });

  try {
    onProgress?.({
      stage: "loading-engine",
      completed,
      total: selectedPages.length,
    });
    const tesseract = await import("tesseract.js");
    worker = await tesseract.createWorker("eng", tesseract.OEM.LSTM_ONLY, {
      workerPath: "/tesseract/worker.min.js",
      corePath: "/tesseract/core",
      langPath: "/tesseract/lang",
      workerBlobURL: false,
      cacheMethod: "write",
      logger: (message) => {
        onProgress?.({
          stage:
            message.status === "recognizing text"
              ? "recognising"
              : "loading-engine",
          completed,
          total: selectedPages.length,
          pageNumber: currentPageNumber,
          engineStatus: message.status,
          engineProgress: message.progress,
        });
      },
    });
    if (options.signal?.aborted) throw abortError();

    const results: RecognisedPage[] = [];
    for (const pageIndex of selectedPages) {
      if (options.signal?.aborted) throw abortError();
      currentPageNumber = pageIndex + 1;
      const page = await document.getPage(currentPageNumber);
      let canvas: HTMLCanvasElement | null = null;
      try {
        if (options.skipTextPages) {
          const textContent = await page.getTextContent();
          const items = textContent.items.map((item) =>
            "str" in item ? { str: item.str } : {},
          );
          if (hasMeaningfulPdfText(items)) {
            results.push({
              pageIndex,
              pageNumber: currentPageNumber,
              text: "",
              confidence: null,
              wordCount: 0,
              skipped: true,
              canvasWidth: 0,
              canvasHeight: 0,
              words: [],
            });
            completed += 1;
            onProgress?.({
              stage: "recognising",
              completed,
              total: selectedPages.length,
              pageNumber: currentPageNumber,
              engineStatus: "skipped existing text",
              engineProgress: 1,
            });
            continue;
          }
        }

        const rendered = await renderOcrCanvas(page, options.signal);
        canvas = rendered.canvas;
        const recognition = await raceWithOcrAbort(
          worker.recognize(canvas, {}, { blocks: true }),
          options.signal,
        );
        if (options.signal?.aborted) throw abortError();
        const words = recognition.data.blocks
          ? flattenWords(recognition.data.blocks)
          : [];
        results.push({
          pageIndex,
          pageNumber: currentPageNumber,
          text: recognition.data.text,
          confidence: recognition.data.confidence,
          wordCount: words.length,
          skipped: false,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          words,
        });
        completed += 1;
        onProgress?.({
          stage: "recognising",
          completed,
          total: selectedPages.length,
          pageNumber: currentPageNumber,
          engineStatus: "recognised page",
          engineProgress: 1,
        });
      } finally {
        page.cleanup();
        if (canvas) {
          canvas.width = 0;
          canvas.height = 0;
        }
      }
    }

    if (options.signal?.aborted) throw abortError();
    let searchablePdf: Uint8Array | null = null;
    if (options.createSearchablePdf) {
      onProgress?.({
        stage: "assembling",
        completed,
        total: selectedPages.length,
      });
      searchablePdf = await buildSearchableOcrPdf(source, results);
    }
    const publicPages: OcrPageText[] = results.map(
      ({ pageNumber, text, confidence, wordCount, skipped }) => ({
        pageNumber,
        text,
        confidence,
        wordCount,
        skipped,
      }),
    );
    const confidenceValues = publicPages.flatMap((page) =>
      page.confidence === null ? [] : [page.confidence],
    );
    return {
      pages: publicPages,
      text: combineOcrText(publicPages),
      searchablePdf,
      recognisedPages: publicPages.filter((page) => !page.skipped).length,
      skippedPages: publicPages.filter((page) => page.skipped).length,
      averageConfidence: confidenceValues.length
        ? confidenceValues.reduce((sum, value) => sum + value, 0) /
          confidenceValues.length
        : null,
    };
  } catch (cause) {
    if (options.signal?.aborted) throw abortError();
    throw cause;
  } finally {
    options.signal?.removeEventListener("abort", terminate);
    terminate();
    if (termination) await termination;
    await loadingTask.destroy();
  }
}
