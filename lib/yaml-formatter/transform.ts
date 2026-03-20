import { parse, stringify } from "yaml"
import type { JsonIndentSize, TransformResult, YamlToolMode } from "./types"

/**
 * Runs the selected YAML/JSON transform on non-empty input.
 * Empty trimmed input yields empty output with no error.
 */
export function runYamlTransform(
  input: string,
  mode: YamlToolMode,
  yamlIndent: number,
  jsonIndent: JsonIndentSize,
): TransformResult {
  const trimmed = input.trim()
  if (!trimmed) {
    return { output: "", error: null }
  }

  try {
    if (mode === "format-yaml") {
      const doc = parse(trimmed)
      return {
        output: stringify(doc, { indent: yamlIndent }),
        error: null,
      }
    }

    if (mode === "yaml-to-json") {
      const doc = parse(trimmed)
      const space = jsonIndent === 0 ? undefined : jsonIndent
      return {
        output: JSON.stringify(doc, null, space),
        error: null,
      }
    }

    const jsonParsed = JSON.parse(trimmed) as unknown
    return {
      output: stringify(jsonParsed, { indent: yamlIndent }),
      error: null,
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Invalid YAML or JSON"
    return { output: "", error: message }
  }
}
