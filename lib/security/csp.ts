export type CspDirective = {
  name: string;
  values: string[];
};

export type CspWarning = {
  code: string;
  message: string;
  severity: "high" | "medium" | "info";
};

const TOKEN_PATTERN = /^[^;,\r\n\s]+$/;
const DIRECTIVE_PATTERN = /^[a-z][a-z0-9-]*$/;

export function parseCspValues(input: string): string[] {
  const values = input.trim().split(/\s+/).filter(Boolean);
  if (values.some((value) => !TOKEN_PATTERN.test(value))) {
    throw new Error(
      "CSP source values cannot contain commas, semicolons, or line breaks.",
    );
  }
  return [...new Set(values)];
}

export function buildCsp(directives: CspDirective[]): string {
  const parts: string[] = [];
  const seen = new Set<string>();
  for (const directive of directives) {
    const name = directive.name.trim().toLowerCase();
    if (!DIRECTIVE_PATTERN.test(name))
      throw new Error(`Invalid CSP directive: ${directive.name}`);
    if (seen.has(name)) throw new Error(`Duplicate CSP directive: ${name}`);
    seen.add(name);
    const values = directive.values
      .map((value) => value.trim())
      .filter(Boolean);
    if (values.some((value) => !TOKEN_PATTERN.test(value))) {
      throw new Error(`Invalid source value in ${name}.`);
    }
    parts.push(
      values.length ? `${name} ${[...new Set(values)].join(" ")}` : name,
    );
  }
  return parts.join("; ");
}

export function cspWarnings(directives: CspDirective[]): CspWarning[] {
  const map = new Map(
    directives.map((directive) => [directive.name, directive.values]),
  );
  const warnings: CspWarning[] = [];
  const all = directives.flatMap((directive) => directive.values);
  if (!map.has("default-src"))
    warnings.push({
      code: "default-src",
      message:
        "Add default-src as a fallback for resource types without their own directive.",
      severity: "high",
    });
  if (all.includes("*"))
    warnings.push({
      code: "wildcard",
      message:
        "A wildcard source allows content from any origin and substantially weakens the policy.",
      severity: "high",
    });
  const scripts = map.get("script-src") ?? map.get("default-src") ?? [];
  if (scripts.includes("'unsafe-eval'"))
    warnings.push({
      code: "unsafe-eval",
      message:
        "'unsafe-eval' permits string-to-code execution and weakens script injection protection.",
      severity: "high",
    });
  if (scripts.includes("'unsafe-inline'"))
    warnings.push({
      code: "unsafe-inline-script",
      message:
        "'unsafe-inline' in script-src allows inline scripts; prefer nonces or hashes.",
      severity: "high",
    });
  if (scripts.includes("data:"))
    warnings.push({
      code: "data-script",
      message:
        "data: in script-src can allow executable content embedded directly in a URL.",
      severity: "high",
    });
  const styles = map.get("style-src") ?? map.get("default-src") ?? [];
  if (styles.includes("'unsafe-inline'"))
    warnings.push({
      code: "unsafe-inline-style",
      message:
        "Inline styles are allowed. This is common for some frameworks but still weakens style injection controls.",
      severity: "medium",
    });
  if (!map.has("object-src") || !map.get("object-src")?.includes("'none'"))
    warnings.push({
      code: "object-src",
      message:
        "Set object-src 'none' unless legacy plugin content is deliberately required.",
      severity: "medium",
    });
  if (!map.has("base-uri"))
    warnings.push({
      code: "base-uri",
      message:
        "Add base-uri to prevent injected <base> elements from rewriting relative URLs.",
      severity: "medium",
    });
  if (!map.has("frame-ancestors"))
    warnings.push({
      code: "frame-ancestors",
      message:
        "Add frame-ancestors to control which sites may embed this page.",
      severity: "medium",
    });
  if (!map.has("form-action"))
    warnings.push({
      code: "form-action",
      message: "Add form-action to restrict where forms may submit data.",
      severity: "info",
    });
  return warnings;
}

export const CSP_PRESETS: Record<"strict" | "website" | "api", CspDirective[]> =
  {
    strict: [
      { name: "default-src", values: ["'none'"] },
      { name: "script-src", values: ["'self'"] },
      { name: "style-src", values: ["'self'"] },
      { name: "img-src", values: ["'self'"] },
      { name: "font-src", values: ["'self'"] },
      { name: "connect-src", values: ["'self'"] },
      { name: "base-uri", values: ["'self'"] },
      { name: "form-action", values: ["'self'"] },
      { name: "frame-ancestors", values: ["'none'"] },
      { name: "object-src", values: ["'none'"] },
      { name: "upgrade-insecure-requests", values: [] },
    ],
    website: [
      { name: "default-src", values: ["'self'"] },
      { name: "script-src", values: ["'self'"] },
      { name: "style-src", values: ["'self'", "'unsafe-inline'"] },
      { name: "img-src", values: ["'self'", "data:", "https:"] },
      { name: "font-src", values: ["'self'", "data:"] },
      { name: "connect-src", values: ["'self'"] },
      { name: "base-uri", values: ["'self'"] },
      { name: "form-action", values: ["'self'"] },
      { name: "frame-ancestors", values: ["'none'"] },
      { name: "object-src", values: ["'none'"] },
      { name: "upgrade-insecure-requests", values: [] },
    ],
    api: [
      { name: "default-src", values: ["'none'"] },
      { name: "frame-ancestors", values: ["'none'"] },
      { name: "form-action", values: ["'none'"] },
      { name: "base-uri", values: ["'none'"] },
      { name: "object-src", values: ["'none'"] },
    ],
  };
