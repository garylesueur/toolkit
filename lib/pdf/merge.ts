import { PDFDocument } from "pdf-lib";

import { loadPdfBytes } from "./load";

export type MergeInput = {
  name: string;
  bytes: Uint8Array;
  pageCount: number;
};

/** Load a file and return merge input metadata. */
export async function prepareMergeInput(file: File): Promise<MergeInput> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const doc = await loadPdfBytes(bytes);
  return { name: file.name, bytes, pageCount: doc.getPageCount() };
}

/** Merge multiple PDFs into one in the given order. */
export async function mergePdfs(inputs: MergeInput[]): Promise<PDFDocument> {
  const result = await PDFDocument.create();

  for (const input of inputs) {
    const source = await loadPdfBytes(input.bytes);
    const indices = Array.from({ length: source.getPageCount() }, (_, i) => i);
    const copiedPages = await result.copyPages(source, indices);
    for (const page of copiedPages) {
      result.addPage(page);
    }
  }

  return result;
}
