"use client";

import { RiFileCopyLine, RiCheckLine, RiCloseLine } from "@remixicon/react";
import { useState, useMemo, useCallback } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { csvToJson, jsonToCsv } from "@/lib/csv-json/convert";
import type { CsvDelimiter, JsonIndentSize } from "@/lib/csv-json/types";

const COPY_RESET_MS = 2000;

type Direction = "csv-to-json" | "json-to-csv";

const DELIMITER_OPTIONS: {
  key: string;
  delimiter: CsvDelimiter;
  label: string;
}[] = [
  { key: "comma", delimiter: ",", label: "Comma" },
  { key: "tab", delimiter: "\t", label: "Tab" },
  { key: "semicolon", delimiter: ";", label: "Semicolon" },
];

function delimiterKeyFromValue(d: CsvDelimiter): string {
  const found = DELIMITER_OPTIONS.find((o) => o.delimiter === d);
  return found?.key ?? "comma";
}

export default function CsvJsonConverterPage() {
  const [direction, setDirection] = useState<Direction>("csv-to-json");
  const [input, setInput] = useState("");
  const [delimiter, setDelimiter] = useState<CsvDelimiter>(",");
  const [firstRowHeaders, setFirstRowHeaders] = useState(true);
  const [indent, setIndent] = useState<JsonIndentSize>(2);
  const [copied, setCopied] = useState(false);

  const { output, error } = useMemo(() => {
    if (direction === "csv-to-json") {
      const result = csvToJson({
        csv: input,
        delimiter,
        firstRowHeaders,
        indent,
      });
      if (result.error) {
        return { output: "", error: result.error };
      }
      return { output: result.output, error: null as string | null };
    }
    const result = jsonToCsv({ json: input, delimiter });
    if (result.error) {
      return { output: "", error: result.error };
    }
    return { output: result.output, error: null as string | null };
  }, [direction, input, delimiter, firstRowHeaders, indent]);

  const handleCopy = useCallback(async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), COPY_RESET_MS);
  }, [output]);

  const handleClear = useCallback(() => {
    setInput("");
  }, []);

  const inputLabel = direction === "csv-to-json" ? "CSV input" : "JSON input";
  const outputLabel =
    direction === "csv-to-json" ? "JSON output" : "CSV output";

  return (
    <TooltipProvider>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          CSV ↔ JSON Converter
        </h1>
        <p className="text-muted-foreground mt-1">
          Convert between CSV and JSON with configurable delimiters. JSON → CSV
          expects an array of objects (with headers from keys) or an array of
          string arrays (rows).
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="flex gap-0 rounded-md border p-0.5">
            <Button
              type="button"
              variant={direction === "csv-to-json" ? "default" : "outline"}
              className="rounded-md border-0"
              onClick={() => setDirection("csv-to-json")}
            >
              CSV → JSON
            </Button>
            <Button
              type="button"
              variant={direction === "json-to-csv" ? "default" : "outline"}
              className="rounded-md border-0"
              onClick={() => setDirection("json-to-csv")}
            >
              JSON → CSV
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Label
              htmlFor="delimiter"
              className="text-muted-foreground text-xs whitespace-nowrap"
            >
              Delimiter
            </Label>
            <Select
              value={delimiterKeyFromValue(delimiter)}
              onValueChange={(key) => {
                const opt = DELIMITER_OPTIONS.find((o) => o.key === key);
                if (opt) setDelimiter(opt.delimiter);
              }}
            >
              <SelectTrigger id="delimiter" size="sm" className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DELIMITER_OPTIONS.map((d) => (
                  <SelectItem key={d.key} value={d.key}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {direction === "csv-to-json" && (
            <>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={firstRowHeaders}
                  onChange={(e) => setFirstRowHeaders(e.target.checked)}
                  className="size-4 rounded border-input"
                />
                First row is headers
              </label>
              <div className="flex gap-0 rounded-md border p-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant={indent === 2 ? "default" : "outline"}
                      size="sm"
                      className="rounded-md border-0 text-xs"
                      onClick={() => setIndent(2)}
                    >
                      2-space JSON
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Pretty-print JSON with indentation
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant={indent === 0 ? "default" : "outline"}
                      size="sm"
                      className="rounded-md border-0 text-xs"
                      onClick={() => setIndent(0)}
                    >
                      Minified JSON
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Single-line JSON output</TooltipContent>
                </Tooltip>
              </div>
            </>
          )}

          <div className="flex-1" />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={!output}
          >
            {copied ? (
              <RiCheckLine data-icon="inline-start" />
            ) : (
              <RiFileCopyLine data-icon="inline-start" />
            )}
            {copied ? "Copied" : "Copy output"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={!input}
          >
            <RiCloseLine data-icon="inline-start" />
            Clear
          </Button>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <label
              htmlFor="csv-json-input"
              className="mb-2 block text-sm font-medium"
            >
              {inputLabel}
            </label>
            <Textarea
              id="csv-json-input"
              placeholder={
                direction === "csv-to-json"
                  ? "name,email\nAda,ada@example.com"
                  : '[{"name":"Ada","email":"ada@example.com"}]'
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="min-h-72 resize-y font-mono text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="csv-json-output"
              className="mb-2 block text-sm font-medium"
            >
              {outputLabel}
            </label>
            <Textarea
              id="csv-json-output"
              readOnly
              tabIndex={-1}
              placeholder="Converted output appears here…"
              value={output}
              className="min-h-72 resize-y font-mono text-sm bg-muted/30"
            />
          </div>
        </div>

        {error && <p className="text-destructive mt-4 text-sm">{error}</p>}
      </div>
    </TooltipProvider>
  );
}
