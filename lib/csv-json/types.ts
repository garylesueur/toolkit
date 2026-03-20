/** Field separator for CSV parse and unparse. */
export type CsvDelimiter = "," | "\t" | ";"

export type JsonIndentSize = 2 | 0

export interface CsvToJsonInput {
  csv: string
  delimiter: CsvDelimiter
  /** When true, first row is treated as column names → JSON array of objects. */
  firstRowHeaders: boolean
  indent: JsonIndentSize
}

export interface JsonToCsvInput {
  json: string
  delimiter: CsvDelimiter
}

export type CsvToJsonResult =
  | { output: string; error: null }
  | { output: ""; error: string }

export type JsonToCsvResult =
  | { output: string; error: null }
  | { output: ""; error: string }
