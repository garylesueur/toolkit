import { PDFDocument, StandardFonts, grayscale } from "pdf-lib";

import {
  formatPageNumber,
  numberedPageIndices,
  pageNumberPoint,
} from "./page-number-options.ts";
import type {
  PageNumberFormat,
  PageNumberPosition,
} from "./page-number-options.ts";

export type AddPageNumbersOptions = {
  colour: "dark" | "light";
  fontSize: number;
  format: PageNumberFormat;
  margin: number;
  pages: number[];
  position: PageNumberPosition;
  startNumber: number;
};

export async function addPageNumbers(
  source: Uint8Array,
  options: AddPageNumbersOptions,
  onProgress?: (completed: number, total: number) => void,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(source);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const indices = numberedPageIndices(options.pages, pdf.getPageCount());
  const finalValue = options.startNumber + indices.length - 1;

  for (let index = 0; index < indices.length; index++) {
    const page = pdf.getPage(indices[index]);
    const value = options.startNumber + index;
    const label = formatPageNumber(value, finalValue, options.format);
    const textWidth = font.widthOfTextAtSize(label, options.fontSize);
    const { width, height } = page.getSize();
    const point = pageNumberPoint(
      width,
      height,
      textWidth,
      options.fontSize,
      options.margin,
      options.position,
    );

    page.drawText(label, {
      ...point,
      color: options.colour === "light" ? grayscale(1) : grayscale(0.15),
      font,
      opacity: 0.9,
      size: options.fontSize,
    });
    onProgress?.(index + 1, indices.length);
  }

  pdf.setProducer("Toolkit — toolkit.lesueur.uk");
  return pdf.save({ useObjectStreams: true });
}
