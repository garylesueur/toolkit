import { PDFDocument } from "pdf-lib";

/** Flatten all form fields in a PDF, baking their values into the page content. */
export async function flattenPdf(
  sourceBytes: Uint8Array,
): Promise<PDFDocument> {
  const pdfDoc = await PDFDocument.load(sourceBytes);
  const form = pdfDoc.getForm();
  form.flatten();
  return pdfDoc;
}
