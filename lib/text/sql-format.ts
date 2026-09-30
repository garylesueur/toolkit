import sqlFormatter from "@sqltools/formatter";

export type SqlLanguage = "sql" | "db2" | "n1ql" | "pl/sql";
export type SqlKeywordCase = "preserve" | "upper" | "lower";

export type SqlFormatOptions = {
  indent: "  " | "    " | "\t";
  keywordCase: SqlKeywordCase;
  language: SqlLanguage;
  linesBetweenQueries: number | "preserve";
};

export type SqlMinifyOptions = {
  keepComments: boolean;
  language: SqlLanguage;
};

type SqlToken = {
  type: string;
  value: string;
};

const COMMENT_TYPES = new Set(["line-comment", "block-comment"]);

export function formatSql(input: string, options: SqlFormatOptions): string {
  if (!input.trim()) return "";
  return sqlFormatter.format(input, {
    indent: options.indent,
    language: options.language,
    linesBetweenQueries: options.linesBetweenQueries,
    reservedWordCase:
      options.keywordCase === "preserve" ? undefined : options.keywordCase,
  });
}

export function minifySql(input: string, options: SqlMinifyOptions): string {
  if (!input.trim()) return "";
  const tokens = sqlFormatter.tokenize(input, {
    language: options.language,
  }) as SqlToken[];
  const meaningful = tokens.filter(
    (token) =>
      token.type !== "whitespace" &&
      (options.keepComments || !COMMENT_TYPES.has(token.type)),
  );
  let output = "";
  let previous: SqlToken | null = null;

  for (const token of meaningful) {
    const value = COMMENT_TYPES.has(token.type)
      ? token.value.trim()
      : token.value;
    if (previous && needsSpace(previous, token)) output += " ";
    output += value;
    previous = token;
  }
  return output.trim();
}

function needsSpace(previous: SqlToken, current: SqlToken): boolean {
  if (COMMENT_TYPES.has(previous.type) || COMMENT_TYPES.has(current.type))
    return true;
  if (current.type === "close-paren" || previous.type === "open-paren")
    return false;
  if (current.type === "open-paren") return false;
  if (
    previous.type === "no-space-operator" ||
    current.type === "no-space-operator"
  )
    return false;
  if (isTightPunctuation(current.value)) return false;
  if (previous.value === ".") return false;
  if (previous.value === "," || previous.value === ";") return true;
  return true;
}

function isTightPunctuation(value: string): boolean {
  return value === "," || value === ";" || value === ".";
}
