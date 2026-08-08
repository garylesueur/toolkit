import { XMLBuilder, XMLParser, XMLValidator } from "fast-xml-parser";

export type XmlValidation = {
  column: number | null;
  line: number | null;
  message: string | null;
  valid: boolean;
};

export type XmlIndent = "  " | "    " | "\t";

const PARSER_OPTIONS = {
  attributeNamePrefix: "@",
  ignoreAttributes: false,
  parseAttributeValue: false,
  parseTagValue: false,
  textNodeName: "#text",
  trimValues: true,
};

export function validateXml(input: string): XmlValidation {
  if (!input.trim()) {
    return {
      column: null,
      line: null,
      message: "Enter some XML first.",
      valid: false,
    };
  }
  if (/<!DOCTYPE\b/i.test(input)) {
    return {
      column: null,
      line: null,
      message:
        "DOCTYPE declarations are disabled to avoid entity expansion and external-resource ambiguity.",
      valid: false,
    };
  }
  const result = XMLValidator.validate(input, {
    allowBooleanAttributes: false,
  });
  if (result === true) {
    return { column: null, line: null, message: null, valid: true };
  }
  return {
    column: result.err.col,
    line: result.err.line,
    message: result.err.msg,
    valid: false,
  };
}

export function formatXml(input: string, indent: XmlIndent = "  "): string {
  assertValidXml(input);
  const parser = new XMLParser({
    ...PARSER_OPTIONS,
    preserveOrder: true,
    trimValues: false,
  });
  const builder = new XMLBuilder({
    ...PARSER_OPTIONS,
    format: true,
    indentBy: indent,
    preserveOrder: true,
    suppressEmptyNode: false,
  });
  return builder.build(parser.parse(input)).trim();
}

export function minifyXml(input: string): string {
  assertValidXml(input);
  const parser = new XMLParser({
    ...PARSER_OPTIONS,
    preserveOrder: true,
    trimValues: true,
  });
  const builder = new XMLBuilder({
    ...PARSER_OPTIONS,
    format: false,
    preserveOrder: true,
    suppressEmptyNode: false,
  });
  return builder.build(parser.parse(input)).trim();
}

export function xmlToJson(input: string, indent = 2): string {
  assertValidXml(input);
  const parsed = new XMLParser(PARSER_OPTIONS).parse(input);
  return JSON.stringify(parsed, null, indent);
}

export function jsonToXml(input: string, indent: XmlIndent = "  "): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch (failure) {
    const message =
      failure instanceof Error ? failure.message : "Invalid JSON.";
    throw new Error(`Invalid JSON: ${message}`);
  }
  if (!isRecord(parsed) || Object.keys(parsed).length !== 1) {
    throw new Error(
      "JSON must contain exactly one top-level XML root element.",
    );
  }
  const xml = new XMLBuilder({
    ...PARSER_OPTIONS,
    format: true,
    indentBy: indent,
    suppressEmptyNode: false,
  })
    .build(parsed)
    .trim();
  assertValidXml(xml);
  return xml;
}

function assertValidXml(input: string): void {
  const validation = validateXml(input);
  if (!validation.valid) {
    const location =
      validation.line === null
        ? ""
        : ` at line ${validation.line}, column ${validation.column}`;
    throw new Error(`${validation.message ?? "Invalid XML"}${location}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
