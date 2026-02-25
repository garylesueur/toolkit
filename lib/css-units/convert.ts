export type CssUnit = "px" | "rem" | "em" | "vh" | "vw"

export const CSS_UNITS: CssUnit[] = ["px", "rem", "em", "vh", "vw"]

export interface ConversionConfig {
  baseFontSize: number
  viewportWidth: number
  viewportHeight: number
}

export const DEFAULT_CONFIG: ConversionConfig = {
  baseFontSize: 16,
  viewportWidth: 1920,
  viewportHeight: 1080,
}

/**
 * Converts a value from the given source unit to pixels.
 */
function toPx(value: number, unit: CssUnit, config: ConversionConfig): number {
  switch (unit) {
    case "px":
      return value
    case "rem":
    case "em":
      return value * config.baseFontSize
    case "vh":
      return (value / 100) * config.viewportHeight
    case "vw":
      return (value / 100) * config.viewportWidth
  }
}

/**
 * Converts a pixel value to the given target unit.
 */
function fromPx(px: number, unit: CssUnit, config: ConversionConfig): number {
  switch (unit) {
    case "px":
      return px
    case "rem":
    case "em":
      return px / config.baseFontSize
    case "vh":
      return (px / config.viewportHeight) * 100
    case "vw":
      return (px / config.viewportWidth) * 100
  }
}

export type ConversionResults = Record<CssUnit, number>

/**
 * Converts a value from one CSS unit to all supported units.
 */
export function convertCssUnit(
  value: number,
  sourceUnit: CssUnit,
  config: ConversionConfig,
): ConversionResults {
  const px = toPx(value, sourceUnit, config)
  const results = {} as ConversionResults
  for (const unit of CSS_UNITS) {
    results[unit] = fromPx(px, unit, config)
  }
  return results
}

/**
 * Formats a number to a reasonable number of decimal places,
 * stripping trailing zeroes.
 */
export function formatValue(value: number): string {
  if (Number.isInteger(value)) return value.toString()
  return parseFloat(value.toFixed(4)).toString()
}
