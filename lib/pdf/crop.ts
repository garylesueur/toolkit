import { PDFDocument } from "pdf-lib";

import { calculateCropBox, cropPageIndices } from "./crop-options.ts";
import type { CropMargins } from "./crop-options.ts";

export async function cropPdf(
  source: Uint8Array,
  margins: CropMargins,
  selectedPages: number[],
  onProgress?: (completed: number, total: number) => void,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(source);
  const indices = cropPageIndices(selectedPages, pdf.getPageCount());

  for (let index = 0; index < indices.length; index++) {
    const page = pdf.getPage(indices[index]);
    const crop = calculateCropBox(page.getCropBox(), margins);
    page.setCropBox(crop.x, crop.y, crop.width, crop.height);
    onProgress?.(index + 1, indices.length);
  }

  pdf.setProducer("Toolkit — toolkit.lesueur.uk");
  return pdf.save({ useObjectStreams: true });
}
