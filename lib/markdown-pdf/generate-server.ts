import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  FONT_DESCRIPTORS,
  isStandardFontFile,
  ROBOTO_FILENAMES,
} from "./fonts";
import type { PdfMakeRuntime } from "./pdfmake-runtime";
import { buildDocDefinition } from "./to-docdefinition";
import type { MarkdownPdfOptions } from "./types";

/**
 * Server-side twin of `generate-client.ts`, sharing the same document builder,
 * themes, and font set. The TTFs come from `public/fonts`, which Vercel keeps
 * in the deployment and exposes to functions through `process.cwd()`.
 */
let runtime: Promise<PdfMakeRuntime> | null = null;

async function loadRuntime(): Promise<PdfMakeRuntime> {
  const imported = await import("pdfmake");
  const pdfMake = ("default" in imported
    ? imported.default
    : imported) as unknown as PdfMakeRuntime;

  const fontDir = path.join(process.cwd(), "public", "fonts");
  const fonts = await Promise.all(
    ROBOTO_FILENAMES.map(async (filename) => ({
      filename,
      bytes: await readFile(path.join(fontDir, filename)),
    })),
  );

  for (const font of fonts) {
    pdfMake.virtualfs.writeFileSync(font.filename, font.bytes);
  }

  pdfMake.addFonts(FONT_DESCRIPTORS);
  // Critical on the server: without this, an image or font reference in
  // attacker-supplied markdown would make the function fetch arbitrary URLs
  // (SSRF) or read arbitrary local paths.
  pdfMake.setUrlAccessPolicy(() => false);
  pdfMake.setLocalAccessPolicy?.(isStandardFontFile);

  return pdfMake;
}

function getRuntime(): Promise<PdfMakeRuntime> {
  if (!runtime) {
    runtime = loadRuntime().catch((err: unknown) => {
      runtime = null;
      throw err;
    });
  }
  return runtime;
}

export type GeneratedPdf = {
  bytes: Uint8Array;
  warnings: string[];
};

export async function generateMarkdownPdf(
  markdown: string,
  options: MarkdownPdfOptions,
): Promise<GeneratedPdf> {
  const pdfMake = await getRuntime();
  const { docDefinition, warnings } = buildDocDefinition(markdown, options);
  const bytes = await pdfMake.createPdf(docDefinition).getBuffer();

  return { bytes, warnings };
}
