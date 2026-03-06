export type FormatResult =
  | { formatted: string; error: null }
  | { formatted: ""; error: string }

export interface JsonStats {
  lines: number
  bytes: number
}

export type IndentSize = 2 | 0
