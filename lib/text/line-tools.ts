export type LineOperation =
  | "sort"
  | "deduplicate"
  | "shuffle"
  | "reverse"
  | "number";

export type LineTransformOptions = {
  caseSensitive: boolean;
  numberSeparator: string;
  numericSort: boolean;
  operation: LineOperation;
  padNumbers: boolean;
  removeBlankLines: boolean;
  sortDirection: "ascending" | "descending";
  startNumber: number;
  trimLines: boolean;
};

export type LineStats = {
  blank: number;
  lines: number;
  unique: number;
};

export function transformLines(
  input: string,
  options: LineTransformOptions,
  random: () => number = Math.random,
): string {
  if (input === "") return "";
  let lines = input.split(/\r\n|\r|\n/);
  if (options.trimLines) lines = lines.map((line) => line.trim());
  if (options.removeBlankLines) lines = lines.filter((line) => line !== "");

  if (options.operation === "sort") {
    const collator = new Intl.Collator("en", {
      numeric: options.numericSort,
      sensitivity: options.caseSensitive ? "variant" : "base",
    });
    lines = [...lines].sort((left, right) => collator.compare(left, right));
    if (options.sortDirection === "descending") lines.reverse();
  } else if (options.operation === "deduplicate") {
    const seen = new Set<string>();
    lines = lines.filter((line) => {
      const key = options.caseSensitive ? line : line.toLocaleLowerCase("en");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } else if (options.operation === "shuffle") {
    lines = shuffleLines(lines, random);
  } else if (options.operation === "reverse") {
    lines = [...lines].reverse();
  } else if (options.operation === "number") {
    const start = normalizeStartNumber(options.startNumber);
    const width = options.padNumbers
      ? String(start + Math.max(0, lines.length - 1)).length
      : 0;
    lines = lines.map((line, index) => {
      const number = String(start + index).padStart(width, "0");
      return `${number}${options.numberSeparator}${line}`;
    });
  }
  return lines.join("\n");
}

export function shuffleLines(
  lines: string[],
  random: () => number = Math.random,
): string[] {
  const result = [...lines];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const value = random();
    const bounded = Number.isFinite(value)
      ? Math.min(Math.max(value, 0), 0.999999999)
      : 0;
    const target = Math.floor(bounded * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function getLineStats(input: string, caseSensitive = true): LineStats {
  if (input === "") return { blank: 0, lines: 0, unique: 0 };
  const lines = input.split(/\r\n|\r|\n/);
  const keys = lines.map((line) =>
    caseSensitive ? line : line.toLocaleLowerCase("en"),
  );
  return {
    blank: lines.filter((line) => line === "").length,
    lines: lines.length,
    unique: new Set(keys).size,
  };
}

function normalizeStartNumber(value: number): number {
  return Number.isFinite(value) ? Math.trunc(value) : 1;
}
