import { extractedFontMetadata } from "./extract-fonts-options";
import {
  extractPdfResourceFiles,
  type PdfImageExtractionStage,
} from "./extract-images";

export type ExtractedPdfFont = {
  name: string;
  bytes: Uint8Array;
  size: number;
  mimeType: "font/ttf";
  subset: boolean;
};

export async function extractPdfFonts(
  source: Uint8Array,
  pages: number[],
  options: {
    signal?: AbortSignal;
    onStage?: (stage: PdfImageExtractionStage) => void;
  } = {},
): Promise<ExtractedPdfFont[]> {
  const files = await extractPdfResourceFiles("font", source, pages, options);
  return files.map((file) => ({
    ...file,
    ...extractedFontMetadata(file.name, file.bytes),
  }));
}
