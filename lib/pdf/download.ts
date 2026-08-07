import type { PDFDocument } from "pdf-lib";

/** Save a pdf-lib document and trigger a browser download. */
export async function downloadPdf(
  pdfDoc: PDFDocument,
  filename: string,
): Promise<void> {
  const bytes = await pdfDoc.save();
  downloadPdfBytes(bytes, filename);
}

/** Trigger a browser download from raw PDF bytes. */
export function downloadPdfBytes(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  // Revoking synchronously can cancel blob downloads in some browsers before
  // they have taken ownership of the URL.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
