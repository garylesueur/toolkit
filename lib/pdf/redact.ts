import { PDFArray, PDFDict, PDFDocument, PDFName } from "pdf-lib";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";

import {
  REDACTION_QUALITY,
  redactionCanvasRect,
  redactionsOnPage,
  validateRedactions,
} from "./redact-options.ts";
import type { RedactionBox, RedactionQuality } from "./redact-options.ts";
import { assembleCompressedPdf } from "./strong-compress-assemble.ts";
import type { CompressedPageImage } from "./strong-compress-assemble.ts";
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

export type RedactProgress = {
  completed: number;
  total: number;
  pageNumber: number;
  stage: "rendering" | "verifying";
};

export type RedactPdfOptions = {
  boxes: RedactionBox[];
  quality: RedactionQuality;
  signal?: AbortSignal;
};

function abortError(): DOMException {
  return new DOMException("PDF redaction cancelled.", "AbortError");
}

function canvasToJpeg(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          reject(new Error("The browser could not encode a redacted page."));
          return;
        }
        resolve(new Uint8Array(await blob.arrayBuffer()));
      },
      "image/jpeg",
      quality,
    );
  });
}

async function renderRedactedPage(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  boxes: RedactionBox[],
  scale: number,
  quality: number,
  signal?: AbortSignal,
): Promise<CompressedPageImage> {
  if (signal?.aborted) throw abortError();
  const page = await pdf.getPage(pageNumber);
  let canvas: HTMLCanvasElement | null = null;
  let task: RenderTask | null = null;
  const cancel = () => task?.cancel();

  try {
    const viewport = page.getViewport({ scale });
    const natural = page.getViewport({ scale: 1 });
    const dimensions = validateCanvasSize(viewport.width, viewport.height);
    canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Could not create a redaction canvas.");

    signal?.addEventListener("abort", cancel, { once: true });
    task = page.render({
      canvas,
      canvasContext: context,
      viewport,
      background: "#ffffff",
    });
    await task.promise;
    if (signal?.aborted) throw abortError();

    context.fillStyle = "#000000";
    for (const box of boxes) {
      const rect = redactionCanvasRect(box, canvas.width, canvas.height);
      context.fillRect(rect.x, rect.y, rect.width, rect.height);
    }

    return {
      jpegBytes: await canvasToJpeg(canvas, quality),
      pageWidth: natural.width,
      pageHeight: natural.height,
    };
  } catch (error) {
    if (signal?.aborted) throw abortError();
    throw error;
  } finally {
    signal?.removeEventListener("abort", cancel);
    page.cleanup();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}

export async function verifyRedactedPdf(
  bytes: Uint8Array,
  expectedPages: number,
): Promise<void> {
  const pdf = await PDFDocument.load(bytes);
  if (pdf.getPageCount() !== expectedPages) {
    throw new Error("Redaction verification found a page-count mismatch.");
  }
  for (const key of [
    "AcroForm",
    "Names",
    "Outlines",
    "OCProperties",
  ] as const) {
    if (pdf.catalog.get(PDFName.of(key))) {
      throw new Error(`Redaction verification found remaining ${key} data.`);
    }
  }
  for (const page of pdf.getPages()) {
    const annotationEntry = page.node.get(PDFName.of("Annots"));
    if (annotationEntry) {
      const annotations = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
      if (!annotations || annotations.size() > 0) {
        throw new Error("Redaction verification found remaining annotations.");
      }
    }
    const resources = page.node.lookupMaybe(PDFName.of("Resources"), PDFDict);
    if (!resources) {
      throw new Error("Redaction verification found a page without resources.");
    }
    const images = resources.lookupMaybe(PDFName.of("XObject"), PDFDict);
    if (!images || images.keys().length === 0) {
      throw new Error("Redaction verification found a page without an image.");
    }
    const fontEntry = resources.get(PDFName.of("Font"));
    if (fontEntry) {
      const fonts = resources.lookupMaybe(PDFName.of("Font"), PDFDict);
      if (!fonts || fonts.keys().length > 0) {
        throw new Error(
          "Redaction verification found remaining font resources.",
        );
      }
    }
  }
}

export async function redactPdf(
  source: Uint8Array,
  options: RedactPdfOptions,
  onProgress?: (progress: RedactProgress) => void,
): Promise<Uint8Array> {
  if (!source.byteLength) throw new Error("Choose a non-empty PDF first.");
  const settings = REDACTION_QUALITY[options.quality];
  if (!settings) throw new Error("Choose a supported redaction quality.");
  const scale = dpiToPdfScale(settings.dpi);
  const pdfjs = await getPdfjs();
  const loadingTask = pdfjs.getDocument({ data: source.slice() });
  const pdf = await loadingTask.promise;

  try {
    validateRedactions(options.boxes, pdf.numPages);
    const pages: CompressedPageImage[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      if (options.signal?.aborted) throw abortError();
      pages.push(
        await renderRedactedPage(
          pdf,
          pageNumber,
          redactionsOnPage(options.boxes, pageNumber - 1),
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
    const output = await assembleCompressedPdf(
      pages,
      "Le Sueur Toolkit verified flattened redaction",
    );
    onProgress?.({
      stage: "verifying",
      completed: pdf.numPages,
      total: pdf.numPages,
      pageNumber: pdf.numPages,
    });
    await verifyRedactedPdf(output, pdf.numPages);
    return output;
  } finally {
    await loadingTask.destroy();
  }
}
