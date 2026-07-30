/**
 * pdfmake ships separate browser and server entry points, and `@types/pdfmake`
 * only describes part of the 0.3 surface. This is the narrow contract both
 * runtimes satisfy, so neither generator has to reach for `any`.
 */
export type FontContainer = {
  vfs: Record<string, { data: string; encoding: string }>;
  fonts: Record<string, Record<string, string>>;
};

export type PdfMakeRuntime = {
  addFonts: (fonts: Record<string, Record<string, string>>) => void;
  setUrlAccessPolicy: (callback: (url: string) => boolean) => void;
  /** Server build only — the browser bundle has no local filesystem to guard. */
  setLocalAccessPolicy?: (callback: (path: string) => boolean) => void;
  /** Browser build only — registers font data and descriptors together. */
  addFontContainer?: (container: FontContainer) => void;
  virtualfs: {
    writeFileSync: (
      filename: string,
      content: Uint8Array | string,
      options?: string,
    ) => void;
    existsSync: (filename: string) => boolean;
  };
  createPdf: (docDefinition: Record<string, unknown>) => {
    getBuffer: () => Promise<Uint8Array>;
  };
};
