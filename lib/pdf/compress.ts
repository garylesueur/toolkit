import { PDFDocument } from "pdf-lib";

export type CompressResult = {
  pdfDoc: PDFDocument;
  originalSize: number;
  compressedSize: number;
};

/**
 * "Compress" a PDF by re-saving it.
 * pdf-lib strips unused objects and rebuilds the cross-reference table on save,
 * which can reduce file size — especially for PDFs that have been edited many times.
 * Optionally strips metadata for additional size reduction.
 */
export async function compressPdf(
  sourceBytes: Uint8Array,
  options: { stripMetadata?: boolean } = {},
): Promise<CompressResult> {
  const pdfDoc = await PDFDocument.load(sourceBytes);

  if (options.stripMetadata) {
    pdfDoc.setTitle("");
    pdfDoc.setAuthor("");
    pdfDoc.setSubject("");
    pdfDoc.setKeywords([]);
    pdfDoc.setCreator("");
    pdfDoc.setProducer("");
  }

  const saved = await pdfDoc.save();
  // Reload to get clean document for potential further use
  const result = await PDFDocument.load(saved);

  return {
    pdfDoc: result,
    originalSize: sourceBytes.length,
    compressedSize: saved.length,
  };
}
