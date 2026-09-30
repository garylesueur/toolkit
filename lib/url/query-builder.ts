export type QueryParameter = {
  hasEquals: boolean;
  name: string;
  value: string;
};

export type ParsedUrlQuery = {
  base: string;
  fragment: string;
  parameters: QueryParameter[];
  sourceType: "absolute-url" | "relative-url" | "query-string";
};

const ABSOLUTE_URL_PATTERN = /^[A-Za-z][A-Za-z\d+.-]*:\/\//;

export function parseUrlQuery(input: string): ParsedUrlQuery {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Enter a URL or query string first.");

  const hashIndex = trimmed.indexOf("#");
  const withoutHash = hashIndex >= 0 ? trimmed.slice(0, hashIndex) : trimmed;
  const fragment =
    hashIndex >= 0
      ? decodeComponent(trimmed.slice(hashIndex + 1), "fragment")
      : "";
  const questionIndex = withoutHash.indexOf("?");
  const looksLikeQueryOnly =
    questionIndex < 0 &&
    !ABSOLUTE_URL_PATTERN.test(withoutHash) &&
    !withoutHash.startsWith("/") &&
    (withoutHash.includes("=") || withoutHash.includes("&"));
  const base = looksLikeQueryOnly
    ? ""
    : questionIndex >= 0
      ? withoutHash.slice(0, questionIndex)
      : withoutHash;
  const rawQuery = looksLikeQueryOnly
    ? withoutHash
    : questionIndex >= 0
      ? withoutHash.slice(questionIndex + 1)
      : "";

  return {
    base,
    fragment,
    parameters: parseParameters(rawQuery),
    sourceType:
      base === ""
        ? "query-string"
        : ABSOLUTE_URL_PATTERN.test(base)
          ? "absolute-url"
          : "relative-url",
  };
}

export function buildUrlQuery(
  base: string,
  parameters: QueryParameter[],
  fragment: string,
): string {
  const cleanBase = base.trim().split(/[?#]/, 1)[0];
  const query = parameters
    .filter((parameter) => parameter.name !== "" || parameter.value !== "")
    .map(encodeParameter)
    .join("&");
  const prefix = cleanBase
    ? `${cleanBase}${query ? "?" : ""}`
    : query
      ? "?"
      : "";
  const hash = fragment ? `#${encodeFragment(fragment)}` : "";
  return `${prefix}${query}${hash}`;
}

export function moveQueryParameter(
  parameters: QueryParameter[],
  from: number,
  to: number,
): QueryParameter[] {
  if (
    from < 0 ||
    to < 0 ||
    from >= parameters.length ||
    to >= parameters.length ||
    from === to
  ) {
    return [...parameters];
  }
  const result = [...parameters];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}

function parseParameters(query: string): QueryParameter[] {
  if (!query) return [];
  return query
    .split("&")
    .filter((part) => part !== "")
    .map((part) => {
      const equalsIndex = part.indexOf("=");
      const hasEquals = equalsIndex >= 0;
      return {
        hasEquals,
        name: decodeComponent(
          hasEquals ? part.slice(0, equalsIndex) : part,
          "parameter name",
        ),
        value: hasEquals
          ? decodeComponent(part.slice(equalsIndex + 1), "parameter value")
          : "",
      };
    });
}

function encodeParameter(parameter: QueryParameter): string {
  const pair = new URLSearchParams([
    [parameter.name, parameter.value],
  ]).toString();
  return parameter.hasEquals || parameter.value ? pair : pair.replace(/=$/, "");
}

function encodeFragment(fragment: string): string {
  return encodeURIComponent(fragment).replace(/%2F/gi, "/");
}

function decodeComponent(value: string, label: string): string {
  try {
    return decodeURIComponent(value.replaceAll("+", " "));
  } catch {
    throw new Error(`The ${label} contains malformed percent-encoding.`);
  }
}
