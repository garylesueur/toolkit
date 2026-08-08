"use client";

import { RiCheckLine, RiFileCopyLine, RiSwapLine } from "@remixicon/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  measureCodeChange,
  transformWebCode,
  type WebCodeAction,
  type WebCodeIndent,
  type WebCodeLanguage,
} from "@/lib/web-code/transform";

const SAMPLES: Record<WebCodeLanguage, string> = {
  html: '<main class="card"><h1>Hello world</h1><p>Format this markup.</p></main>',
  css: ".card{display:grid;gap:16px;padding:24px;color:#1f2937}",
  javascript:
    "const greet=(name)=>{return `Hello ${name}`};console.log(greet('Ada'))",
};

const LANGUAGES: { value: WebCodeLanguage; label: string }[] = [
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "javascript", label: "JavaScript" },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function WebCodeFormatterPage() {
  const [language, setLanguage] = useState<WebCodeLanguage>("html");
  const [action, setAction] = useState<WebCodeAction>("format");
  const [indent, setIndent] = useState<WebCodeIndent>(2);
  const [input, setInput] = useState(SAMPLES.html);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);
  const runId = useRef(0);

  useEffect(() => {
    const currentRun = ++runId.current;
    setWorking(true);
    const timeout = window.setTimeout(() => {
      transformWebCode(input, { language, action, indent })
        .then((result) => {
          if (currentRun !== runId.current) return;
          setOutput(result);
          setError(null);
        })
        .catch((caught: unknown) => {
          if (currentRun !== runId.current) return;
          setOutput("");
          setError(
            caught instanceof Error ? caught.message : "Transform failed",
          );
        })
        .finally(() => {
          if (currentRun === runId.current) setWorking(false);
        });
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [action, indent, input, language]);

  const stats = useMemo(
    () => measureCodeChange(input, output),
    [input, output],
  );

  function chooseLanguage(nextLanguage: WebCodeLanguage) {
    setLanguage(nextLanguage);
    setInput(SAMPLES[nextLanguage]);
  }

  async function copyOutput() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  function useOutputAsInput() {
    if (!output) return;
    setInput(output);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        HTML, CSS & JavaScript Formatter
      </h1>
      <p className="text-muted-foreground mt-1">
        Format or minify frontend code with syntax-aware parsers.
      </p>
      <PrivacyBanner>
        Your code is processed entirely in this browser and is never executed or
        uploaded.
      </PrivacyBanner>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        {LANGUAGES.map((item) => (
          <Button
            key={item.value}
            type="button"
            variant={language === item.value ? "default" : "outline"}
            onClick={() => chooseLanguage(item.value)}
          >
            {item.label}
          </Button>
        ))}
        <div className="mx-1 h-6 w-px bg-border" />
        <Button
          type="button"
          variant={action === "format" ? "default" : "outline"}
          onClick={() => setAction("format")}
        >
          Format
        </Button>
        <Button
          type="button"
          variant={action === "minify" ? "default" : "outline"}
          onClick={() => setAction("minify")}
        >
          Minify
        </Button>
        {action === "format" && (
          <label className="ml-auto flex items-center gap-2 text-sm">
            Indent
            <select
              aria-label="Indentation"
              value={indent}
              onChange={(event) =>
                setIndent(Number(event.target.value) as WebCodeIndent)
              }
              className="border-input bg-background h-9 rounded-md border px-3"
            >
              <option value={2}>2 spaces</option>
              <option value={4}>4 spaces</option>
            </select>
          </label>
        )}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section>
          <div className="mb-2 flex items-center justify-between">
            <Label htmlFor="web-code-input">Input</Label>
            <span className="text-muted-foreground text-xs">
              {formatBytes(stats.inputBytes)}
            </span>
          </div>
          <Textarea
            id="web-code-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            spellCheck={false}
            className="min-h-96 resize-y font-mono text-sm"
          />
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between gap-3">
            <Label htmlFor="web-code-output">Output</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">
                {formatBytes(stats.outputBytes)}
                {action === "minify" &&
                  output &&
                  ` · ${stats.reduction}% smaller`}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={useOutputAsInput}
                disabled={!output}
              >
                <RiSwapLine /> Use as input
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyOutput}
                disabled={!output}
              >
                {copied ? <RiCheckLine /> : <RiFileCopyLine />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
          <Textarea
            id="web-code-output"
            value={working ? "Processing…" : output}
            readOnly
            spellCheck={false}
            aria-busy={working}
            className="min-h-96 resize-y font-mono text-sm"
          />
          {error && (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
