import type { FormatResult, JsonStats, IndentSize } from "./types";

export function formatJson(input: string, indent: IndentSize): FormatResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { formatted: "", error: null };
  }

  try {
    const parsed = JSON.parse(trimmed);
    const formatted = JSON.stringify(parsed, null, indent);
    return { formatted, error: null };
  } catch (err) {
    const message = err instanceof SyntaxError ? err.message : "Invalid JSON";
    return { formatted: "", error: message };
  }
}

export function getJsonStats(json: string): JsonStats {
  if (!json) {
    return { lines: 0, bytes: 0 };
  }

  const lines = json.split("\n").length;
  const bytes = new TextEncoder().encode(json).length;

  return { lines, bytes };
}
