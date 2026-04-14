"use client";

import { RiFileCopyLine, RiCheckLine, RiCloseLine } from "@remixicon/react";
import { useState, useMemo, useCallback } from "react";

import { PrivacyBanner } from "@/components/privacy-banner";
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
import { runYamlTransform } from "@/lib/yaml-formatter/transform";
import type { JsonIndentSize, YamlToolMode } from "@/lib/yaml-formatter/types";

const COPY_RESET_MS = 2000;

const MODE_OPTIONS: { value: YamlToolMode; label: string }[] = [
  { value: "format-yaml", label: "Format YAML" },
  { value: "yaml-to-json", label: "YAML → JSON" },
  { value: "json-to-yaml", label: "JSON → YAML" },
];

export default function YamlFormatterPage() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<YamlToolMode>("format-yaml");
  const [yamlIndent, setYamlIndent] = useState<2 | 4>(2);
  const [jsonIndent, setJsonIndent] = useState<JsonIndentSize>(2);
  const [copied, setCopied] = useState(false);

  const { output, error } = useMemo(
    () => runYamlTransform(input, mode, yamlIndent, jsonIndent),
    [input, mode, yamlIndent, jsonIndent],
  );

  const handleCopy = useCallback(async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), COPY_RESET_MS);
  }, [output]);

  const handleClear = useCallback(() => {
    setInput("");
  }, []);

  const inputHint =
    mode === "json-to-yaml"
      ? '{"name": "Ada", "role": "dev"}'
      : "name: Ada\nrole: dev";

  const inputDescription =
    mode === "json-to-yaml" ? "Paste JSON (object or array)." : "Paste YAML.";

  return (
    <TooltipProvider>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">YAML Formatter</h1>
        <p className="text-muted-foreground mt-1">
          Pretty-print YAML, validate syntax, or convert between YAML and JSON.
          Everything stays in your browser.
        </p>
        <PrivacyBanner>
          Your data is processed entirely in your browser. Nothing is stored,
          logged, or sent to a server.
        </PrivacyBanner>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label
              htmlFor="yaml-mode"
              className="text-muted-foreground text-xs whitespace-nowrap"
            >
              Mode
            </Label>
            <Select
              value={mode}
              onValueChange={(v) => setMode(v as YamlToolMode)}
            >
              <SelectTrigger id="yaml-mode" size="sm" className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODE_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(mode === "format-yaml" || mode === "json-to-yaml") && (
            <div className="flex items-center gap-2">
              <Label
                htmlFor="yaml-indent"
                className="text-muted-foreground text-xs whitespace-nowrap"
              >
                YAML indent
              </Label>
              <Select
                value={String(yamlIndent)}
                onValueChange={(v) => setYamlIndent(Number(v) as 2 | 4)}
              >
                <SelectTrigger id="yaml-indent" size="sm" className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 spaces</SelectItem>
                  <SelectItem value="4">4 spaces</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {mode === "yaml-to-json" && (
            <div className="flex gap-0 rounded-md border p-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={jsonIndent === 2 ? "default" : "outline"}
                    size="sm"
                    className="rounded-md border-0 text-xs"
                    onClick={() => setJsonIndent(2)}
                  >
                    2-space JSON
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Pretty-print JSON</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={jsonIndent === 0 ? "default" : "outline"}
                    size="sm"
                    className="rounded-md border-0 text-xs"
                    onClick={() => setJsonIndent(0)}
                  >
                    Minified JSON
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Single-line JSON</TooltipContent>
              </Tooltip>
            </div>
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
              htmlFor="yaml-input"
              className="mb-2 block text-sm font-medium"
            >
              Input
            </label>
            <p className="text-muted-foreground mb-2 text-xs">
              {inputDescription}
            </p>
            <Textarea
              id="yaml-input"
              placeholder={inputHint}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="min-h-72 resize-y font-mono text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="yaml-output"
              className="mb-2 block text-sm font-medium"
            >
              Output
            </label>
            <Textarea
              id="yaml-output"
              readOnly
              tabIndex={-1}
              placeholder="Result appears here…"
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
