import { PDFDocument } from "pdf-lib";

type ResizeOptions = {
  width: number;
  height: number;
  scaleContent: boolean;
  /** 0-based page indices to resize. If undefined, resize all. */
  pages?: number[];
};

/** Resize pages in a PDF. */
export async function resizePdfPages(
  sourceBytes: Uint8Array,
  options: ResizeOptions,
): Promise<PDFDocument> {
  const pdfDoc = await PDFDocument.load(sourceBytes);
  const allPages = pdfDoc.getPages();

  const indices =
    options.pages ?? Array.from({ length: allPages.length }, (_, i) => i);

  for (const i of indices) {
    if (i < 0 || i >= allPages.length) continue;
    const page = allPages[i];

    if (options.scaleContent) {
      const { width: oldW, height: oldH } = page.getSize();
      const scaleX = options.width / oldW;
      const scaleY = options.height / oldH;
      page.scaleContent(scaleX, scaleY);
    }

    page.setSize(options.width, options.height);
  }

  return pdfDoc;
}
