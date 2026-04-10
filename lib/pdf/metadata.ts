import { PDFDocument } from "pdf-lib";

export type PdfMetadata = {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
};

/** Read metadata fields from a PDF. */
export async function readPdfMetadata(
  sourceBytes: Uint8Array,
): Promise<PdfMetadata> {
  const pdfDoc = await PDFDocument.load(sourceBytes);
  return {
    title: pdfDoc.getTitle() ?? "",
    author: pdfDoc.getAuthor() ?? "",
    subject: pdfDoc.getSubject() ?? "",
    keywords: pdfDoc.getKeywords() ?? "",
    creator: pdfDoc.getCreator() ?? "",
    producer: pdfDoc.getProducer() ?? "",
  };
}

/** Update metadata fields on a PDF. */
export async function updatePdfMetadata(
  sourceBytes: Uint8Array,
  metadata: Partial<PdfMetadata>,
): Promise<PDFDocument> {
  const pdfDoc = await PDFDocument.load(sourceBytes);

  if (metadata.title !== undefined) pdfDoc.setTitle(metadata.title);
  if (metadata.author !== undefined) pdfDoc.setAuthor(metadata.author);
  if (metadata.subject !== undefined) pdfDoc.setSubject(metadata.subject);
  if (metadata.keywords !== undefined)
    pdfDoc.setKeywords(metadata.keywords.split(",").map((k) => k.trim()));
  if (metadata.creator !== undefined) pdfDoc.setCreator(metadata.creator);
  if (metadata.producer !== undefined) pdfDoc.setProducer(metadata.producer);

  return pdfDoc;
}

/** Strip all metadata fields from a PDF. */
export async function removePdfMetadata(
  sourceBytes: Uint8Array,
): Promise<PDFDocument> {
  return updatePdfMetadata(sourceBytes, {
    title: "",
    author: "",
    subject: "",
    keywords: "",
    creator: "",
    producer: "",
  });
}
