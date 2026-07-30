import { PDFDocument } from "pdf-lib";

import { loadPdfBytes } from "./load";

/** Flatten all form fields in a PDF, baking their values into the page content. */
export async function flattenPdf(
  sourceBytes: Uint8Array,
): Promise<PDFDocument> {
  const pdfDoc = await loadPdfBytes(sourceBytes);
  const form = pdfDoc.getForm();
  form.flatten();
  return pdfDoc;
}
