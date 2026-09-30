import { PDFDocument } from "pdf-lib";

import type { PageSizeKey } from "./constants";
import { PAGE_SIZES } from "./constants";

const CSS_PIXELS_PER_INCH = 96;
const PDF_POINTS_PER_INCH = 72;
const PIXEL_TO_POINT = PDF_POINTS_PER_INCH / CSS_PIXELS_PER_INCH;
const MAX_PAGE_DIMENSION = 14_400;

export type ImagePageSize = "image" | Extract<PageSizeKey, "A4" | "Letter">;
export type ImagePageOrientation = "auto" | "portrait" | "landscape";

export type PdfImageSource = {
  file: File;
  width: number;
  height: number;
  image: HTMLImageElement;
};

export type ImagesToPdfOptions = {
  pageSize: ImagePageSize;
  orientation: ImagePageOrientation;
  margin: number;
};

function canvasToPng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("The browser could not convert this image."));
        return;
      }
      blob
        .arrayBuffer()
        .then((buffer) => resolve(new Uint8Array(buffer)))
        .catch(reject);
    }, "image/png");
  });
}

async function embedImage(pdfDoc: PDFDocument, source: PdfImageSource) {
  const bytes = new Uint8Array(await source.file.arrayBuffer());
  if (source.file.type === "image/jpeg") return pdfDoc.embedJpg(bytes);
  if (source.file.type === "image/png") return pdfDoc.embedPng(bytes);

  // pdf-lib does not embed WebP directly. Converting through Canvas remains
  // local and preserves transparency by using PNG as the intermediate format.
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create an image canvas.");
  context.drawImage(source.image, 0, 0);
  return pdfDoc.embedPng(await canvasToPng(canvas));
}

function resolvePageDimensions(
  source: PdfImageSource,
  options: ImagesToPdfOptions,
): { width: number; height: number } {
  if (options.pageSize === "image") {
    const dimensions = {
      width: source.width * PIXEL_TO_POINT + options.margin * 2,
      height: source.height * PIXEL_TO_POINT + options.margin * 2,
    };
    const scale = Math.min(
      1,
      MAX_PAGE_DIMENSION / dimensions.width,
      MAX_PAGE_DIMENSION / dimensions.height,
    );
    return {
      width: dimensions.width * scale,
      height: dimensions.height * scale,
    };
  }

  const selected = PAGE_SIZES[options.pageSize];
  const shouldUseLandscape =
    options.orientation === "landscape" ||
    (options.orientation === "auto" && source.width > source.height);

  return shouldUseLandscape
    ? { width: selected.height, height: selected.width }
    : { width: selected.width, height: selected.height };
}

export async function imagesToPdf(
  sources: PdfImageSource[],
  options: ImagesToPdfOptions,
  onProgress?: (completed: number, total: number) => void,
): Promise<Uint8Array> {
  if (sources.length === 0) throw new Error("Add at least one image.");

  const pdfDoc = await PDFDocument.create();

  for (let index = 0; index < sources.length; index++) {
    const source = sources[index];
    const embedded = await embedImage(pdfDoc, source);
    const dimensions = resolvePageDimensions(source, options);
    const page = pdfDoc.addPage([dimensions.width, dimensions.height]);
    const availableWidth = Math.max(1, dimensions.width - options.margin * 2);
    const availableHeight = Math.max(1, dimensions.height - options.margin * 2);
    const scale = Math.min(
      availableWidth / embedded.width,
      availableHeight / embedded.height,
    );
    const width = embedded.width * scale;
    const height = embedded.height * scale;

    page.drawImage(embedded, {
      x: (dimensions.width - width) / 2,
      y: (dimensions.height - height) / 2,
      width,
      height,
    });
    onProgress?.(index + 1, sources.length);
  }

  pdfDoc.setProducer("Toolkit — toolkit.lesueur.uk");
  return pdfDoc.save({ useObjectStreams: true });
}
