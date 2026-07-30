/**
 * pdfmake resolves fonts either from PDF's 14 built-in AFM fonts (no glyph data
 * needed) or from TrueType files. Roboto is served from `public/fonts` and
 * loaded into pdfmake's virtual filesystem, which keeps a single code path for
 * the browser (fetch) and the MCP route handler (fs) and avoids embedding
 * ~640KB of base64 in the JavaScript bundle.
 */
export const ROBOTO_DESCRIPTOR = {
  normal: "Roboto-Regular.ttf",
  bold: "Roboto-Medium.ttf",
  italics: "Roboto-Italic.ttf",
  bolditalics: "Roboto-MediumItalic.ttf",
} as const;

export const FONT_PUBLIC_PATH = "/fonts";

/**
 * The only local paths pdfmake is permitted to touch on the server. Anything
 * else — a font or image path smuggled in through markdown — is refused, so a
 * generated document can never read the filesystem.
 */
const STANDARD_FONT_FILES = new Set([
  "Courier",
  "Courier-Bold",
  "Courier-Oblique",
  "Courier-BoldOblique",
  "Times-Roman",
  "Times-Bold",
  "Times-Italic",
  "Times-BoldItalic",
]);

export function isStandardFontFile(path: string): boolean {
  return STANDARD_FONT_FILES.has(path);
}

export const FONT_DESCRIPTORS: Record<string, Record<string, string>> = {
  Roboto: { ...ROBOTO_DESCRIPTOR },
  Times: {
    normal: "Times-Roman",
    bold: "Times-Bold",
    italics: "Times-Italic",
    bolditalics: "Times-BoldItalic",
  },
  Courier: {
    normal: "Courier",
    bold: "Courier-Bold",
    italics: "Courier-Oblique",
    bolditalics: "Courier-BoldOblique",
  },
};

export const ROBOTO_FILENAMES: string[] = Object.values(ROBOTO_DESCRIPTOR);
