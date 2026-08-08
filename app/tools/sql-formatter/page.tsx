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
import { formatSql, minifySql } from "@/lib/text/sql-format";
import type { SqlKeywordCase, SqlLanguage } from "@/lib/text/sql-format";

type Mode = "format" | "minify";
type IndentChoice = "2" | "4" | "tab";

const EXAMPLE_SQL = `select u.id,u.name,count(o.id) as order_count
from users u
left join orders o on o.user_id=u.id
where u.active=1 and u.created_at >= '2026-01-01'
group by u.id,u.name
order by order_count desc;`;

export default function SqlFormatterPage() {
  const [input, setInput] = useState(EXAMPLE_SQL);
  const [mode, setMode] = useState<Mode>("format");
  const [language, setLanguage] = useState<SqlLanguage>("sql");
  const [keywordCase, setKeywordCase] = useState<SqlKeywordCase>("upper");
  const [indentChoice, setIndentChoice] = useState<IndentChoice>("2");
  const [keepComments, setKeepComments] = useState(true);
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => {
    if (mode === "minify") return minifySql(input, { keepComments, language });
    return formatSql(input, {
      indent:
        indentChoice === "tab" ? "\t" : indentChoice === "4" ? "    " : "  ",
      keywordCase,
      language,
      linesBetweenQueries: 1,
    });
  }, [indentChoice, input, keepComments, keywordCase, language, mode]);

  const copyOutput = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([output], { type: "text/sql" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = mode === "format" ? "formatted.sql" : "minified.sql";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        SQL Formatter & Minifier
      </h1>
      <p className="mt-1 text-muted-foreground">
        Make SQL readable or compact it while preserving quoted values.
      </p>
      <PrivacyBanner>
        Your SQL is processed entirely in this browser and is never sent to a
        database or server.
      </PrivacyBanner>
      <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        Formatting is not validation. Always review and test a query before
        running it, especially after removing comments.
      </div>

      <section className="mt-8 flex flex-wrap gap-2">
        <Button
          variant={mode === "format" ? "default" : "outline"}
          onClick={() => setMode("format")}
        >
          Format
        </Button>
        <Button
          variant={mode === "minify" ? "default" : "outline"}
          onClick={() => setMode("minify")}
        >
          Minify
        </Button>
      </section>

      <section className="mt-5 grid gap-4 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Control label="SQL dialect">
          <select
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            value={language}
            onChange={(event) => setLanguage(event.target.value as SqlLanguage)}
          >
            <option value="sql">Standard SQL</option>
            <option value="db2">DB2</option>
            <option value="n1ql">N1QL</option>
            <option value="pl/sql">PL/SQL</option>
          </select>
        </Control>
        {mode === "format" ? (
          <>
            <Control label="Keyword case">
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={keywordCase}
                onChange={(event) =>
                  setKeywordCase(event.target.value as SqlKeywordCase)
                }
              >
                <option value="upper">UPPERCASE</option>
                <option value="lower">lowercase</option>
                <option value="preserve">Preserve</option>
              </select>
            </Control>
            <Control label="Indentation">
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
            </Control>
          </>
        ) : (
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input
              type="checkbox"
              checked={keepComments}
              onChange={(event) => setKeepComments(event.target.checked)}
            />
            Keep comments
          </label>
        )}
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="sql-input" className="text-sm font-medium">
              Input SQL
            </label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setInput(EXAMPLE_SQL)}
              >
                Example
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setInput("")}>
                Clear
              </Button>
            </div>
          </div>
          <Textarea
            id="sql-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="min-h-96 font-mono text-xs"
            autoCapitalize="none"
            spellCheck={false}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {input.length.toLocaleString()} characters
          </p>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium">
              {mode === "format" ? "Formatted SQL" : "Minified SQL"}
            </h2>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                disabled={!output}
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
                disabled={!output}
                onClick={download}
              >
                <RiFileDownloadLine className="size-4" />
                Download
              </Button>
            </div>
          </div>
          <pre className="min-h-96 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 font-mono text-xs">
            {output || "Output appears here as you type."}
          </pre>
          <p className="mt-2 text-xs text-muted-foreground">
            {output.length.toLocaleString()} characters
            {input.length > 0 && mode === "minify"
              ? ` · ${Math.max(0, input.length - output.length).toLocaleString()} removed`
              : ""}
          </p>
        </div>
      </section>
    </div>
  );
}

type ControlProps = {
  children: React.ReactNode;
  label: string;
};

function Control({ label, children }: ControlProps) {
  return (
    <label className="space-y-1 text-xs font-medium">
      {label}
      {children}
    </label>
  );
}
