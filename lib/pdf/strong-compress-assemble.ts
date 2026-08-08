import { PDFDocument } from "pdf-lib";

export type CompressedPageImage = {
  jpegBytes: Uint8Array;
  pageWidth: number;
  pageHeight: number;
};

export async function assembleCompressedPdf(
  pages: CompressedPageImage[],
): Promise<Uint8Array> {
  if (!pages.length) throw new Error("The PDF has no pages to compress.");
  const output = await PDFDocument.create();

  for (const page of pages) {
    if (
      !Number.isFinite(page.pageWidth) ||
      !Number.isFinite(page.pageHeight) ||
      page.pageWidth <= 0 ||
      page.pageHeight <= 0
    ) {
      throw new Error("A compressed page has invalid dimensions.");
    }
    if (!page.jpegBytes.byteLength) {
      throw new Error("A compressed page image is empty.");
    }
    const image = await output.embedJpg(page.jpegBytes);
    const outputPage = output.addPage([page.pageWidth, page.pageHeight]);
    outputPage.drawImage(image, {
      x: 0,
      y: 0,
      width: page.pageWidth,
      height: page.pageHeight,
    });
  }

  output.setProducer("Le Sueur Toolkit strong PDF compression");
  output.setCreator("Le Sueur Toolkit");
  return output.save({ useObjectStreams: true });
}
