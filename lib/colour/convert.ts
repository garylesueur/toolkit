import type { RgbColour, HslColour } from "./parse"

export function rgbToHex(rgb: RgbColour): string {
  const toHex = (n: number) => n.toString(16).padStart(2, "0")
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`
}

export function rgbToString(rgb: RgbColour): string {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
}

export function rgbToHsl(rgb: RgbColour): HslColour {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const l = (max + min) / 2

  if (delta === 0) {
    return { h: 0, s: 0, l: Math.round(l * 100) }
  }

  const s = delta / (1 - Math.abs(2 * l - 1))

  let h: number
  if (max === r) {
    h = 60 * (((g - b) / delta) % 6)
  } else if (max === g) {
    h = 60 * ((b - r) / delta + 2)
  } else {
    h = 60 * ((r - g) / delta + 4)
  }

  if (h < 0) h += 360

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

export function hslToString(hsl: HslColour): string {
  return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`
}

export interface ColourFormats {
  hex: string
  rgb: string
  hsl: string
}

export function toAllFormats(rgb: RgbColour): ColourFormats {
  return {
    hex: rgbToHex(rgb),
    rgb: rgbToString(rgb),
    hsl: hslToString(rgbToHsl(rgb)),
  }
}
