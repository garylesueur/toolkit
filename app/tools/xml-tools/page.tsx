"use client";

import {
  RiCheckLine,
  RiFileCopyLine,
  RiFileDownloadLine,
} from "@remixicon/react";
import { useMemo, useState } from "react";

import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  formatXml,
  jsonToXml,
  minifyXml,
  validateXml,
  xmlToJson,
} from "@/lib/text/xml-tools";
import type { XmlIndent } from "@/lib/text/xml-tools";

type Mode = "format" | "minify" | "xml-json" | "json-xml";
type IndentChoice = "2" | "4" | "tab";

const XML_EXAMPLE = `<catalog source="local">
  <item id="1">Alpha</item>
  <item id="2">Beta</item>
</catalog>`;

const JSON_EXAMPLE = `{
  "catalog": {
    "@source": "local",
    "item": [
      { "#text": "Alpha", "@id": "1" },
      { "#text": "Beta", "@id": "2" }
    ]
  }
}`;

export default function XmlToolsPage() {
  const [mode, setMode] = useState<Mode>("format");
  const [xmlInput, setXmlInput] = useState(XML_EXAMPLE);
  const [jsonInput, setJsonInput] = useState(JSON_EXAMPLE);
  const [indentChoice, setIndentChoice] = useState<IndentChoice>("2");
  const [copied, setCopied] = useState(false);

  const input = mode === "json-xml" ? jsonInput : xmlInput;
  const setInput = mode === "json-xml" ? setJsonInput : setXmlInput;
  const indent: XmlIndent =
    indentChoice === "tab" ? "\t" : indentChoice === "4" ? "    " : "  ";

  const result = useMemo(() => {
    try {
      const output =
        mode === "format"
          ? formatXml(xmlInput, indent)
          : mode === "minify"
            ? minifyXml(xmlInput)
            : mode === "xml-json"
              ? xmlToJson(xmlInput, indentChoice === "4" ? 4 : 2)
              : jsonToXml(jsonInput, indent);
      return { error: null, output };
    } catch (failure) {
      return {
        error:
          failure instanceof Error
            ? failure.message
            : "The input could not be transformed.",
        output: "",
      };
    }
  }, [indent, indentChoice, jsonInput, mode, xmlInput]);

  const validation = mode === "json-xml" ? null : validateXml(xmlInput);
  const outputLabel =
    mode === "format"
      ? "Formatted XML"
      : mode === "minify"
        ? "Minified XML"
        : mode === "xml-json"
          ? "JSON output"
          : "XML output";

  const copyOutput = async () => {
    await navigator.clipboard.writeText(result.output);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const download = () => {
    const isJson = mode === "xml-json";
    const url = URL.createObjectURL(
      new Blob([result.output], {
        type: isJson ? "application/json" : "application/xml",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = isJson ? "converted.json" : "converted.xml";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        XML Formatter, Validator & Converter
      </h1>
      <p className="mt-1 text-muted-foreground">
        Format or validate XML, minify it, or convert between XML and JSON.
      </p>
      <PrivacyBanner>
        XML and JSON are parsed entirely in this browser. No document contents
        are uploaded or sent to another service.
      </PrivacyBanner>
      <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        DOCTYPE declarations are deliberately rejected. This tool does not fetch
        external schemas, DTDs, or entities, and well-formed XML is not
        necessarily valid against your application&apos;s schema.
      </div>

      <section className="mt-8 flex flex-wrap gap-2">
        <ModeButton current={mode} mode="format" onClick={setMode}>
          Format & validate
        </ModeButton>
        <ModeButton current={mode} mode="minify" onClick={setMode}>
          Minify
        </ModeButton>
        <ModeButton current={mode} mode="xml-json" onClick={setMode}>
          XML → JSON
        </ModeButton>
        <ModeButton current={mode} mode="json-xml" onClick={setMode}>
          JSON → XML
        </ModeButton>
      </section>

      {mode !== "minify" && (
        <label className="mt-5 block max-w-48 space-y-1 text-xs font-medium">
          Indentation
          <select
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            value={indentChoice}
            onChange={(event) =>
              setIndentChoice(event.target.value as IndentChoice)
            }
          >
            <option value="2">2 spaces</option>
            <option value="4">4 spaces</option>
            <option value="tab">Tab</option>
          </select>
        </label>
      )}

      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="structured-input" className="text-sm font-medium">
              {mode === "json-xml" ? "JSON input" : "XML input"}
            </label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setInput(mode === "json-xml" ? JSON_EXAMPLE : XML_EXAMPLE)
                }
              >
                Example
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setInput("")}>
                Clear
              </Button>
            </div>
          </div>
          <Textarea
            id="structured-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="min-h-96 font-mono text-xs"
            autoCapitalize="none"
            spellCheck={false}
          />
          {validation && (
            <p
              className={`mt-2 text-xs ${validation.valid ? "text-green-700 dark:text-green-400" : "text-destructive"}`}
            >
              {validation.valid
                ? "Well-formed XML"
                : `${validation.message ?? "Invalid XML"}${
                    validation.line === null
                      ? ""
                      : ` — line ${validation.line}, column ${validation.column}`
                  }`}
            </p>
          )}
          {mode === "json-xml" && result.error && (
            <p className="mt-2 text-xs text-destructive">{result.error}</p>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium">{outputLabel}</h2>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                disabled={!result.output}
                onClick={copyOutput}
              >
                {copied ? (
                  <RiCheckLine className="size-4" />
                ) : (
                  <RiFileCopyLine className="size-4" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={!result.output}
                onClick={download}
              >
                <RiFileDownloadLine className="size-4" />
                Download
              </Button>
            </div>
          </div>
          <pre className="min-h-96 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 font-mono text-xs">
            {result.output || "Valid output appears here as you type."}
          </pre>
          {mode !== "json-xml" && result.error && (
            <p className="mt-2 text-xs text-destructive">{result.error}</p>
          )}
        </div>
      </section>

      <section className="mt-8 rounded-lg border p-4 text-sm text-muted-foreground">
        <h2 className="font-semibold text-foreground">Conversion convention</h2>
        <p className="mt-1">
          XML attributes use keys prefixed with <code>@</code>, text mixed with
          attributes uses <code>#text</code>, and repeated child elements become
          JSON arrays. JSON → XML requires exactly one top-level root key.
        </p>
      </section>
    </div>
  );
}

type ModeButtonProps = {
  children: React.ReactNode;
  current: Mode;
  mode: Mode;
  onClick: (mode: Mode) => void;
};

function ModeButton({ children, current, mode, onClick }: ModeButtonProps) {
  return (
    <Button
      variant={current === mode ? "default" : "outline"}
      onClick={() => onClick(mode)}
    >
      {children}
    </Button>
  );
}
