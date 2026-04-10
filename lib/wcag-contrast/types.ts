import type { RgbColour } from "@/lib/colour/parse";

/** Pass/fail for each WCAG 2.1 contrast threshold given a ratio. */
export interface WcagCompliance {
  aaNormal: boolean;
  aaLarge: boolean;
  aaaNormal: boolean;
  aaaLarge: boolean;
}

/** Parsed foreground and background with computed contrast. */
export interface ContrastResult {
  foreground: RgbColour;
  background: RgbColour;
  /** Contrast ratio, typically 1–21. */
  ratio: number;
  compliance: WcagCompliance;
}
