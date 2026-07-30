import type { ThemeId } from "./types";

/** Font family names as registered with pdfmake in `fonts.ts`. */
export type FontFamily = "Roboto" | "Times" | "Courier";

export type Theme = {
  bodyFont: FontFamily;
  headingFont: FontFamily;
  codeFont: FontFamily;
  baseFontSize: number;
  lineHeight: number;
  /** Multipliers applied to `baseFontSize` for h1…h6. */
  headingScale: [number, number, number, number, number, number];
  pageMargins: [number, number, number, number];
  colours: {
    text: string;
    heading: string;
    muted: string;
    link: string;
    code: string;
    codeBackground: string;
    rule: string;
    tableHeaderBackground: string;
    quoteBar: string;
  };
};

const THEMES: Record<ThemeId, Theme> = {
  clean: {
    bodyFont: "Roboto",
    headingFont: "Roboto",
    codeFont: "Courier",
    baseFontSize: 11,
    lineHeight: 1.4,
    headingScale: [2, 1.55, 1.3, 1.12, 1, 0.92],
    pageMargins: [56, 56, 56, 56],
    colours: {
      text: "#1f2328",
      heading: "#0b0d0f",
      muted: "#6b7280",
      link: "#1d4ed8",
      code: "#b02a37",
      codeBackground: "#f4f5f7",
      rule: "#d8dbe0",
      tableHeaderBackground: "#f4f5f7",
      quoteBar: "#c7cbd1",
    },
  },
  report: {
    bodyFont: "Times",
    headingFont: "Times",
    codeFont: "Courier",
    baseFontSize: 12,
    lineHeight: 1.5,
    headingScale: [1.9, 1.5, 1.28, 1.12, 1, 0.92],
    pageMargins: [72, 72, 72, 72],
    colours: {
      text: "#111111",
      heading: "#111111",
      muted: "#555555",
      link: "#0b4f9c",
      code: "#8a2b2b",
      codeBackground: "#f2f1ee",
      rule: "#cfcbc2",
      tableHeaderBackground: "#f2f1ee",
      quoteBar: "#b9b4aa",
    },
  },
  technical: {
    bodyFont: "Roboto",
    headingFont: "Roboto",
    codeFont: "Courier",
    baseFontSize: 9.5,
    lineHeight: 1.28,
    headingScale: [1.7, 1.4, 1.2, 1.08, 1, 0.92],
    pageMargins: [40, 40, 40, 40],
    colours: {
      text: "#24292f",
      heading: "#000000",
      muted: "#57606a",
      link: "#0969da",
      code: "#cf222e",
      codeBackground: "#eff1f3",
      rule: "#c9ced4",
      tableHeaderBackground: "#eff1f3",
      quoteBar: "#afb8c1",
    },
  },
};

export function getTheme(id: ThemeId): Theme {
  return THEMES[id];
}
