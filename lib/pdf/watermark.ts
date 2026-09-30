import {
  PDFArray,
  PDFDocument,
  StandardFonts,
  degrees,
  grayscale,
} from "pdf-lib";

import { watermarkPageIndices, watermarkPoint } from "./watermark-options.ts";
import type { WatermarkLayer, WatermarkPosition } from "./watermark-options.ts";

type CommonWatermarkOptions = {
  layer: WatermarkLayer;
  margin: number;
  opacity: number;
  pages: number[];
  position: WatermarkPosition;
  rotation: number;
};

export type TextWatermarkOptions = CommonWatermarkOptions & {
  colour: "dark" | "light";
  fontSize: number;
  kind: "text";
  text: string;
};

export type ImageWatermarkOptions = CommonWatermarkOptions & {
  image: Uint8Array;
  imageType: "png" | "jpeg";
  kind: "image";
  widthPercent: number;
};

export type WatermarkOptions = TextWatermarkOptions | ImageWatermarkOptions;

function sendLatestContentStreamToBack(
  page: ReturnType<PDFDocument["getPage"]>,
) {
  const contents = page.node.Contents();
  if (!(contents instanceof PDFArray) || contents.size() < 2) return;
  const latest = contents.get(contents.size() - 1);
  contents.remove(contents.size() - 1);
  contents.insert(0, latest);
}

export async function watermarkPdf(
  source: Uint8Array,
  options: WatermarkOptions,
  onProgress?: (completed: number, total: number) => void,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(source);
  const indices = watermarkPageIndices(options.pages, pdf.getPageCount());
  const font =
    options.kind === "text"
      ? await pdf.embedFont(StandardFonts.HelveticaBold)
      : null;
  const image =
    options.kind === "image"
      ? options.imageType === "png"
        ? await pdf.embedPng(options.image)
        : await pdf.embedJpg(options.image)
      : null;

  for (let index = 0; index < indices.length; index++) {
    const page = pdf.getPage(indices[index]);
    const { width: pageWidth, height: pageHeight } = page.getSize();

    if (options.kind === "text" && font) {
      const itemWidth = font.widthOfTextAtSize(options.text, options.fontSize);
      const point = watermarkPoint(
        pageWidth,
        pageHeight,
        itemWidth,
        options.fontSize,
        options.rotation,
        options.margin,
        options.position,
      );
      page.drawText(options.text, {
        ...point,
        color: options.colour === "light" ? grayscale(1) : grayscale(0.25),
        font,
        opacity: options.opacity,
        rotate: degrees(options.rotation),
        size: options.fontSize,
      });
    } else if (options.kind === "image" && image) {
      const itemWidth = pageWidth * (options.widthPercent / 100);
      const itemHeight = itemWidth * (image.height / image.width);
      const point = watermarkPoint(
        pageWidth,
        pageHeight,
        itemWidth,
        itemHeight,
        options.rotation,
        options.margin,
        options.position,
      );
      page.drawImage(image, {
        ...point,
        height: itemHeight,
        opacity: options.opacity,
        rotate: degrees(options.rotation),
        width: itemWidth,
      });
    }

    if (options.layer === "background") sendLatestContentStreamToBack(page);
    onProgress?.(index + 1, indices.length);
  }

  pdf.setProducer("Toolkit — toolkit.lesueur.uk");
  return pdf.save({ useObjectStreams: true });
}
