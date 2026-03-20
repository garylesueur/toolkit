import Papa from "papaparse"
import type {
  CsvToJsonInput,
  CsvToJsonResult,
  JsonToCsvInput,
  JsonToCsvResult,
} from "./types"

/**
 * Converts CSV text to formatted JSON using Papa Parse.
 */
export function csvToJson(input: CsvToJsonInput): CsvToJsonResult {
  const trimmed = input.csv.trim()
  if (!trimmed) {
    return { output: "", error: null }
  }

  const parsed = Papa.parse(trimmed, {
    delimiter: input.delimiter,
    header: input.firstRowHeaders,
    skipEmptyLines: "greedy",
  })

  if (parsed.errors.length > 0) {
    const first = parsed.errors[0]
    const rowPart =
      first.row !== undefined ? ` (row ${String(first.row)})` : ""
    const base = first.message ?? "CSV parse error"
    return {
      output: "",
      error: `${base}${rowPart}`,
    }
  }

  const space = input.indent === 0 ? undefined : input.indent
  return {
    output: JSON.stringify(parsed.data, null, space),
    error: null,
  }
}

function isPlainObject(value: object): boolean {
  return !Array.isArray(value)
}

/**
 * Converts JSON (array of objects or array of string arrays) to CSV.
 */
export function jsonToCsv(input: JsonToCsvInput): JsonToCsvResult {
  const trimmed = input.json.trim()
  if (!trimmed) {
    return { output: "", error: null }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed) as unknown
  } catch (err) {
    const message =
      err instanceof SyntaxError ? err.message : "Invalid JSON"
    return { output: "", error: message }
  }

  if (!Array.isArray(parsed)) {
    return {
      output: "",
      error: "JSON must be an array — either an array of objects or an array of rows.",
    }
  }

  if (parsed.length === 0) {
    return {
      output: "",
      error: "Array is empty — nothing to convert to CSV.",
    }
  }

  const first = parsed[0]
  if (
    first === null ||
    typeof first !== "object" ||
    first === undefined
  ) {
    return {
      output: "",
      error: "Each row must be an object or an array of cell values.",
    }
  }

  if (Array.isArray(first)) {
    for (const row of parsed) {
      if (!Array.isArray(row)) {
        return {
          output: "",
          error: "All rows must be arrays when using the array-of-rows format.",
        }
      }
    }
    try {
      const csv = Papa.unparse(parsed as string[][], {
        delimiter: input.delimiter,
      })
      return { output: csv, error: null }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not convert to CSV"
      return { output: "", error: message }
    }
  }

  if (!isPlainObject(first)) {
    return {
      output: "",
      error: "Rows must be plain objects with string keys.",
    }
  }

  for (const row of parsed) {
    if (row === null || typeof row !== "object" || Array.isArray(row)) {
      return {
        output: "",
        error: "All rows must be objects with the same shape.",
      }
    }
  }

  try {
    const csv = Papa.unparse(
      parsed as Record<string, string | number | boolean | null>[],
      { delimiter: input.delimiter },
    )
    return { output: csv, error: null }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not convert to CSV"
    return { output: "", error: message }
  }
}
