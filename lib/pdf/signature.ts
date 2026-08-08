import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import {
  fitSignatureSize,
  signaturePageIndex,
  signaturePoint,
} from "./signature-options.ts";
import type { SignaturePosition } from "./signature-options.ts";

type CommonSignatureOptions = {
  margin: number;
  page: number;
  position: SignaturePosition;
  widthPercent: number;
};

export type TypedSignatureOptions = CommonSignatureOptions & {
  colour: "black" | "blue";
  kind: "text";
  text: string;
};

export type ImageSignatureOptions = CommonSignatureOptions & {
  image: Uint8Array;
  imageType: "jpeg" | "png";
  kind: "image";
};

export type SignatureOptions = TypedSignatureOptions | ImageSignatureOptions;

export async function placeSignaturePdf(
  source: Uint8Array,
  options: SignatureOptions,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(source);
  const pageIndex = signaturePageIndex(options.page, pdf.getPageCount());
  const page = pdf.getPage(pageIndex);
  const { width: pageWidth, height: pageHeight } = page.getSize();

  if (options.kind === "text") {
    const text = options.text.trim();
    if (!text) throw new Error("Enter a signature before placing it.");
    const font = await pdf.embedFont(StandardFonts.TimesRomanItalic);
    const aspectRatio =
      font.widthOfTextAtSize(text, 1) / Math.max(font.heightAtSize(1), 0.01);
    const size = fitSignatureSize(
      pageWidth,
      pageHeight,
      aspectRatio,
      options.widthPercent,
      options.margin,
    );
    const fontSize = size.height / font.heightAtSize(1);
    page.drawText(text, {
      ...signaturePoint(
        pageWidth,
        pageHeight,
        size.width,
        size.height,
        options.margin,
        options.position,
      ),
      color:
        options.colour === "blue"
          ? rgb(0.04, 0.16, 0.5)
          : rgb(0.08, 0.08, 0.08),
      font,
      size: fontSize,
    });
  } else {
    const image =
      options.imageType === "png"
        ? await pdf.embedPng(options.image)
        : await pdf.embedJpg(options.image);
    const size = fitSignatureSize(
      pageWidth,
      pageHeight,
      image.width / image.height,
      options.widthPercent,
      options.margin,
    );
    page.drawImage(image, {
      ...signaturePoint(
        pageWidth,
        pageHeight,
        size.width,
        size.height,
        options.margin,
        options.position,
      ),
      ...size,
    });
  }

  pdf.setProducer("Toolkit — toolkit.lesueur.uk");
  return pdf.save({ useObjectStreams: true });
}
