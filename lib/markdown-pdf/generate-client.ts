import { FONT_PUBLIC_PATH, ROBOTO_DESCRIPTOR, ROBOTO_FILENAMES } from "./fonts";
import type { FontContainer, PdfMakeRuntime } from "./pdfmake-runtime";
import { buildDocDefinition } from "./to-docdefinition";
import type { MarkdownPdfOptions } from "./types";

/**
 * pdfmake's browser build is around a megabyte, so it is loaded on demand the
 * same way `lib/pdf/to-markdown.ts` defers pdfjs-dist rather than pulling it
 * into the page bundle.
 */
let runtime: Promise<PdfMakeRuntime> | null = null;

function toBase64(bytes: Uint8Array): string {
  // Chunked so a large font doesn't blow the argument limit on String.fromCharCode.
  const CHUNK = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

async function loadFontFile(filename: string): Promise<string> {
  const response = await fetch(`${FONT_PUBLIC_PATH}/${filename}`);
  if (!response.ok) {
    throw new Error(`Could not load font ${filename} (${response.status}).`);
  }
  const buffer = await response.arrayBuffer();
  return toBase64(new Uint8Array(buffer));
}

async function robotoContainer(): Promise<FontContainer> {
  const loaded = await Promise.all(
    ROBOTO_FILENAMES.map(async (filename) => ({
      filename,
      data: await loadFontFile(filename),
    })),
  );

  const vfs: FontContainer["vfs"] = {};
  for (const font of loaded) {
    vfs[font.filename] = { data: font.data, encoding: "base64" };
  }

  return { vfs, fonts: { Roboto: ROBOTO_DESCRIPTOR } };
}

async function loadRuntime(): Promise<PdfMakeRuntime> {
  const imported = await import("pdfmake/build/pdfmake");
  const pdfMake = ("default" in imported
    ? imported.default
    : imported) as unknown as PdfMakeRuntime;

  if (!pdfMake.addFontContainer) {
    throw new Error(
      "This build of pdfmake cannot register fonts in the browser.",
    );
  }

  /**
   * The 14 built-in PDF fonts need no glyph data, but pdfkit still wants their
   * AFM metrics — on the server those come off disk, in the browser they have
   * to be handed over explicitly.
   */
  const [courier, times, roboto] = await Promise.all([
    import("pdfmake/build/standard-fonts/Courier.js"),
    import("pdfmake/build/standard-fonts/Times.js"),
    robotoContainer(),
  ]);

  pdfMake.addFontContainer(courier.default);
  pdfMake.addFontContainer(times.default);
  pdfMake.addFontContainer(roboto);

  // Markdown must never make the renderer fetch a URL of its own accord. There
  // is no local-access policy here: the browser bundle has no filesystem.
  pdfMake.setUrlAccessPolicy(() => false);

  return pdfMake;
}

function getRuntime(): Promise<PdfMakeRuntime> {
  if (!runtime) {
    runtime = loadRuntime().catch((err: unknown) => {
      // A failed load must not be cached, or every later attempt fails too.
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
