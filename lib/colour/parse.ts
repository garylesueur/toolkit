export interface RgbColour {
  r: number;
  g: number;
  b: number;
  /** 0–1. Absent or 1 means fully opaque. */
  a?: number;
}

export interface HslColour {
  h: number;
  s: number;
  l: number;
}

const HEX_3_RE = /^#?([0-9a-f]{3})$/i;
const HEX_4_RE = /^#?([0-9a-f]{4})$/i;
const HEX_6_RE = /^#?([0-9a-f]{6})$/i;
const HEX_8_RE = /^#?([0-9a-f]{8})$/i;

/**
 * Both the legacy comma form and the modern space/slash form are accepted:
 * `rgb(255, 0, 0)`, `rgba(255, 0, 0, .5)` and `rgb(255 0 0 / 50%)` are all in
 * everyday use, and a colour tool that rejects any of them just looks broken.
 */
const NUMBER = String.raw`[-+]?\d*\.?\d+`;
const SEPARATOR = String.raw`\s*(?:,|\s)\s*`;
const ALPHA_SEPARATOR = String.raw`\s*(?:,|\/)\s*`;

const RGB_RE = new RegExp(
  `^rgba?\\(\\s*(${NUMBER})%?${SEPARATOR}(${NUMBER})%?${SEPARATOR}(${NUMBER})%?(?:${ALPHA_SEPARATOR}(${NUMBER})(%?))?\\s*\\)$`,
  "i",
);

const HSL_RE = new RegExp(
  `^hsla?\\(\\s*(${NUMBER})(?:deg)?${SEPARATOR}(${NUMBER})%${SEPARATOR}(${NUMBER})%(?:${ALPHA_SEPARATOR}(${NUMBER})(%?))?\\s*\\)$`,
  "i",
);

const HEX_ALPHA_MAX = 255;
const PERCENT_MAX = 100;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Alpha may be written as a 0–1 number or a percentage. */
function parseAlpha(raw: string | undefined, isPercent: string | undefined) {
  if (raw === undefined) return undefined;
  const value = parseFloat(raw);
  if (Number.isNaN(value)) return undefined;
  return clamp(isPercent ? value / PERCENT_MAX : value, 0, 1);
}

function isValidRgb(r: number, g: number, b: number): boolean {
  return r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255;
}

/**
 * Attempts to parse a colour string in hex, rgb(), or hsl() format
 * and returns normalised RGB values, or `null` if the input is unrecognised.
 */
export function parseColour(input: string): RgbColour | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const hex8 = HEX_8_RE.exec(trimmed);
  if (hex8) {
    const hex = hex8[1];
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: parseInt(hex.slice(6, 8), 16) / HEX_ALPHA_MAX,
    };
  }

  const hex6 = HEX_6_RE.exec(trimmed);
  if (hex6) {
    const hex = hex6[1];
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }

  const hex4 = HEX_4_RE.exec(trimmed);
  if (hex4) {
    const hex = hex4[1];
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
      a: parseInt(hex[3] + hex[3], 16) / HEX_ALPHA_MAX,
    };
  }

  const hex3 = HEX_3_RE.exec(trimmed);
  if (hex3) {
    const hex = hex3[1];
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
    };
  }

  const rgb = RGB_RE.exec(trimmed);
  if (rgb) {
    const r = Math.round(parseFloat(rgb[1]));
    const g = Math.round(parseFloat(rgb[2]));
    const b = Math.round(parseFloat(rgb[3]));
    if (!isValidRgb(r, g, b)) return null;

    const a = parseAlpha(rgb[4], rgb[5]);
    return a === undefined ? { r, g, b } : { r, g, b, a };
  }

  const hsl = HSL_RE.exec(trimmed);
  if (hsl) {
    const h = clamp(parseFloat(hsl[1]), 0, 360);
    const s = clamp(parseFloat(hsl[2]), 0, 100);
    const l = clamp(parseFloat(hsl[3]), 0, 100);

    const a = parseAlpha(hsl[4], hsl[5]);
    const base = hslToRgb({ h, s, l });
    return a === undefined ? base : { ...base, a };
  }

  return null;
}

/** Converts HSL to RGB. Expects h in [0,360], s and l in [0,100]. */
export function hslToRgb(hsl: HslColour): RgbColour {
  const { h, s: sPercent, l: lPercent } = hsl;
  const s = sPercent / 100;
  const l = lPercent / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r1: number;
  let g1: number;
  let b1: number;

  if (h < 60) {
    r1 = c;
    g1 = x;
    b1 = 0;
  } else if (h < 120) {
    r1 = x;
    g1 = c;
    b1 = 0;
  } else if (h < 180) {
    r1 = 0;
    g1 = c;
    b1 = x;
  } else if (h < 240) {
    r1 = 0;
    g1 = x;
    b1 = c;
  } else if (h < 300) {
    r1 = x;
    g1 = 0;
    b1 = c;
  } else {
    r1 = c;
    g1 = 0;
    b1 = x;
  }

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}
