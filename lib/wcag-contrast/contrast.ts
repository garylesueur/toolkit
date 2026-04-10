import type { RgbColour } from "@/lib/colour/parse";
import { parseColour } from "@/lib/colour/parse";

import type { ContrastResult, WcagCompliance } from "./types";

/**
 * Converts an sRGB channel in 0–255 to linear light (WCAG definition).
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function channelToLinear(channel8Bit: number): number {
  const c = channel8Bit / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * WCAG 2.1 relative luminance for an sRGB colour.
 */
export function relativeLuminance(rgb: RgbColour): number {
  const R = channelToLinear(rgb.r);
  const G = channelToLinear(rgb.g);
  const B = channelToLinear(rgb.b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Contrast ratio between two sRGB colours (order-independent).
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */
export function contrastRatioBetweenColours(
  a: RgbColour,
  b: RgbColour,
): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const THRESHOLDS = {
  aaNormal: 4.5,
  aaLarge: 3,
  aaaNormal: 7,
  aaaLarge: 4.5,
} as const;

export function complianceForRatio(ratio: number): WcagCompliance {
  return {
    aaNormal: ratio >= THRESHOLDS.aaNormal,
    aaLarge: ratio >= THRESHOLDS.aaLarge,
    aaaNormal: ratio >= THRESHOLDS.aaaNormal,
    aaaLarge: ratio >= THRESHOLDS.aaaLarge,
  };
}

/**
 * Parses two colour strings and returns contrast analysis, or `null` if either is invalid.
 */
export function analyseContrast(
  foregroundInput: string,
  backgroundInput: string,
): ContrastResult | null {
  const foreground = parseColour(foregroundInput);
  const background = parseColour(backgroundInput);
  if (!foreground || !background) return null;

  const ratio = contrastRatioBetweenColours(foreground, background);

  return {
    foreground,
    background,
    ratio,
    compliance: complianceForRatio(ratio),
  };
}

export function formatRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`;
}
