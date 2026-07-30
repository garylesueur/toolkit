export const THEME_IDS = ["clean", "report", "technical"] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export type PageSizeId = "A4" | "LETTER";

export type MarkdownPdfOptions = {
  theme: ThemeId;
  pageSize: PageSizeId;
  /** Rendered in the footer alongside the page number. */
  title: string;
  includePageNumbers: boolean;
};

export const DEFAULT_OPTIONS: MarkdownPdfOptions = {
  theme: "clean",
  pageSize: "A4",
  title: "",
  includePageNumbers: true,
};

export type ThemeSummary = {
  id: ThemeId;
  name: string;
  description: string;
};

export const THEME_SUMMARIES: ThemeSummary[] = [
  {
    id: "clean",
    name: "Clean",
    description:
      "Roboto throughout, generous spacing, blue links. A good default.",
  },
  {
    id: "report",
    name: "Report",
    description:
      "Times serif body with wide margins — reads like a printed document.",
  },
  {
    id: "technical",
    name: "Technical",
    description:
      "Tighter leading, smaller type, heavier rules. Fits more on a page.",
  },
];
