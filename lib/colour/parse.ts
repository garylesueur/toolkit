export interface RgbColour {
  r: number
  g: number
  b: number
}

export interface HslColour {
  h: number
  s: number
  l: number
}

const HEX_3_RE = /^#?([0-9a-f]{3})$/i
const HEX_6_RE = /^#?([0-9a-f]{6})$/i
const RGB_RE = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i
const HSL_RE =
  /^hsl\(\s*(\d{1,3}(?:\.\d+)?)\s*,\s*(\d{1,3}(?:\.\d+)?)%\s*,\s*(\d{1,3}(?:\.\d+)?)%\s*\)$/i

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function isValidRgb(r: number, g: number, b: number): boolean {
  return r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255
}

/**
 * Attempts to parse a colour string in hex, rgb(), or hsl() format
 * and returns normalised RGB values, or `null` if the input is unrecognised.
 */
export function parseColour(input: string): RgbColour | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const hex6 = HEX_6_RE.exec(trimmed)
  if (hex6) {
    const hex = hex6[1]
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    }
  }

  const hex3 = HEX_3_RE.exec(trimmed)
  if (hex3) {
    const hex = hex3[1]
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
    }
  }

  const rgb = RGB_RE.exec(trimmed)
  if (rgb) {
    const r = parseInt(rgb[1], 10)
    const g = parseInt(rgb[2], 10)
    const b = parseInt(rgb[3], 10)
    if (!isValidRgb(r, g, b)) return null
    return { r, g, b }
  }

  const hsl = HSL_RE.exec(trimmed)
  if (hsl) {
    const h = clamp(parseFloat(hsl[1]), 0, 360)
    const s = clamp(parseFloat(hsl[2]), 0, 100)
    const l = clamp(parseFloat(hsl[3]), 0, 100)
    return hslToRgb({ h, s, l })
  }

  return null
}

/** Converts HSL to RGB. Expects h in [0,360], s and l in [0,100]. */
export function hslToRgb(hsl: HslColour): RgbColour {
  const { h, s: sPercent, l: lPercent } = hsl
  const s = sPercent / 100
  const l = lPercent / 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2

  let r1: number
  let g1: number
  let b1: number

  if (h < 60) {
    r1 = c; g1 = x; b1 = 0
  } else if (h < 120) {
    r1 = x; g1 = c; b1 = 0
  } else if (h < 180) {
    r1 = 0; g1 = c; b1 = x
  } else if (h < 240) {
    r1 = 0; g1 = x; b1 = c
  } else if (h < 300) {
    r1 = x; g1 = 0; b1 = c
  } else {
    r1 = c; g1 = 0; b1 = x
  }

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  }
}
