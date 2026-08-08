"use client";

import {
  RiAddLine,
  RiAlertLine,
  RiCheckLine,
  RiFileCopyLine,
  RiInformationLine,
  RiShieldCheckLine,
  RiSubtractLine,
} from "@remixicon/react";
import { useMemo, useState } from "react";

import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CSP_PRESETS,
  buildCsp,
  cspWarnings,
  parseCspValues,
} from "@/lib/security/csp";
import type { CspDirective } from "@/lib/security/csp";

type Preset = keyof typeof CSP_PRESETS;
type EditableDirective = { id: number; name: string; values: string };

const COMMON_DIRECTIVES = [
  "default-src",
  "script-src",
  "style-src",
  "img-src",
  "font-src",
  "connect-src",
  "media-src",
  "worker-src",
  "frame-src",
  "frame-ancestors",
  "object-src",
  "base-uri",
  "form-action",
  "manifest-src",
  "upgrade-insecure-requests",
];

function presetRows(preset: Preset): EditableDirective[] {
  return CSP_PRESETS[preset].map((directive, index) => ({
    id: index,
    name: directive.name,
    values: directive.values.join(" "),
  }));
}

function escapeAttribute(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

export default function CspBuilderPage() {
  const [rows, setRows] = useState<EditableDirective[]>(() =>
    presetRows("website"),
  );
  const [nextId, setNextId] = useState(rows.length);
  const [newDirective, setNewDirective] = useState("media-src");
  const [copied, setCopied] = useState<string | null>(null);

  const result = useMemo(() => {
    try {
      const directives: CspDirective[] = rows.map((row) => ({
        name: row.name,
        values: parseCspValues(row.values),
      }));
      const policy = buildCsp(directives);
      return { directives, error: null, policy };
    } catch (failure) {
      return {
        directives: [],
        error:
          failure instanceof Error
            ? failure.message
            : "This policy could not be generated.",
        policy: "",
      };
    }
  }, [rows]);

  const warnings = result.error ? [] : cspWarnings(result.directives);
  const header = `Content-Security-Policy: ${result.policy}`;
  const reportOnly = `Content-Security-Policy-Report-Only: ${result.policy}`;
  const meta = `<meta http-equiv="Content-Security-Policy" content="${escapeAttribute(result.policy)}">`;

  const choosePreset = (preset: Preset) => {
    const nextRows = presetRows(preset);
    setRows(nextRows);
    setNextId(nextRows.length);
  };

  const copy = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1800);
  };

  const addDirective = () => {
    if (rows.some((row) => row.name === newDirective)) return;
    setRows((current) => [
      ...current,
      { id: nextId, name: newDirective, values: "'self'" },
    ]);
    setNextId((current) => current + 1);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        Content Security Policy Builder
      </h1>
      <p className="mt-1 text-muted-foreground">
        Build a CSP header and spot directives that weaken browser protections.
      </p>
      <PrivacyBanner>
        Your policy stays in this browser. Nothing is sent to a server.
      </PrivacyBanner>
      <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        Test a new policy with Content-Security-Policy-Report-Only before
        enforcing it. CSP is defence in depth and does not replace output
        escaping, sanitisation, or secure application code.
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Start with a preset</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => choosePreset("strict")}>
            Strict app
          </Button>
          <Button variant="outline" onClick={() => choosePreset("website")}>
            Typical website
          </Button>
          <Button variant="outline" onClick={() => choosePreset("api")}>
            API only
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Presets are starting points. Add the exact origins, nonces, or hashes
          your application needs.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Directives</h2>
        <div className="mt-3 space-y-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[13rem_1fr_auto]"
            >
              <label
                htmlFor={`directive-${row.id}`}
                className="space-y-1 text-xs font-medium"
              >
                Directive
                <Input
                  id={`directive-${row.id}`}
                  aria-label="Directive name"
                  value={row.name}
                  onChange={(event) =>
                    setRows((current) =>
                      current.map((item) =>
                        item.id === row.id
                          ? { ...item, name: event.target.value }
                          : item,
                      ),
                    )
                  }
                  className="font-mono"
                  spellCheck={false}
                />
              </label>
              <label
                htmlFor={`sources-${row.id}`}
                className="space-y-1 text-xs font-medium"
              >
                Sources (space separated)
                <Input
                  id={`sources-${row.id}`}
                  aria-label={`${row.name} sources`}
                  value={row.values}
                  onChange={(event) =>
                    setRows((current) =>
                      current.map((item) =>
                        item.id === row.id
                          ? { ...item, values: event.target.value }
                          : item,
                      ),
                    )
                  }
                  placeholder={
                    row.name === "upgrade-insecure-requests"
                      ? "No value required"
                      : "'self' https://example.com"
                  }
                  className="font-mono"
                  spellCheck={false}
                />
              </label>
              <Button
                variant="ghost"
                size="icon"
                className="self-end"
                aria-label={`Remove ${row.name}`}
                onClick={() =>
                  setRows((current) =>
                    current.filter((item) => item.id !== row.id),
                  )
                }
              >
                <RiSubtractLine className="size-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="new-directive">
            Directive to add
          </label>
          <select
            id="new-directive"
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={newDirective}
            onChange={(event) => setNewDirective(event.target.value)}
          >
            {COMMON_DIRECTIVES.map((directive) => (
              <option key={directive} value={directive}>
                {directive}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            disabled={rows.some((row) => row.name === newDirective)}
            onClick={addDirective}
          >
            <RiAddLine className="size-4" />
            Add directive
          </Button>
        </div>
        {result.error && (
          <p className="mt-3 text-sm text-destructive">{result.error}</p>
        )}
      </section>

      {!result.error && (
        <>
          <section className="mt-8">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Policy review</h2>
              {warnings.length === 0 && (
                <span className="flex items-center gap-1 text-sm text-green-700 dark:text-green-400">
                  <RiShieldCheckLine className="size-4" />
                  No common weaknesses found
                </span>
              )}
            </div>
            {warnings.length > 0 && (
              <div className="mt-3 space-y-2">
                {warnings.map((warning) => (
                  <div
                    key={warning.code}
                    className={`flex gap-3 rounded-lg border p-4 text-sm ${
                      warning.severity === "high"
                        ? "border-destructive/30 bg-destructive/5"
                        : warning.severity === "medium"
                          ? "border-amber-500/30 bg-amber-500/5"
                          : "bg-muted/30"
                    }`}
                  >
                    {warning.severity === "info" ? (
                      <RiInformationLine className="mt-0.5 size-4 shrink-0" />
                    ) : (
                      <RiAlertLine className="mt-0.5 size-4 shrink-0" />
                    )}
                    <div>
                      <p className="font-medium capitalize">
                        {warning.severity} priority
                      </p>
                      <p className="mt-0.5 text-muted-foreground">
                        {warning.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-8 space-y-4">
            <h2 className="text-lg font-semibold">Copy your policy</h2>
            <Output
              title="Enforcing HTTP header"
              value={header}
              copied={copied === "header"}
              onCopy={() => copy("header", header)}
            />
            <Output
              title="Report-only HTTP header"
              value={reportOnly}
              copied={copied === "report"}
              onCopy={() => copy("report", reportOnly)}
            />
            <Output
              title="HTML meta tag"
              value={meta}
              copied={copied === "meta"}
              onCopy={() => copy("meta", meta)}
            />
            <p className="text-xs text-muted-foreground">
              Meta-tag policies cannot use frame-ancestors, sandbox, report-uri,
              or report-to. Prefer an HTTP response header whenever possible.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

function Output({
  title,
  value,
  copied,
  onCopy,
}: {
  title: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-2">
        <h3 className="text-sm font-medium">{title}</h3>
        <Button size="sm" variant="ghost" onClick={onCopy}>
          {copied ? (
            <RiCheckLine className="size-4" />
          ) : (
            <RiFileCopyLine className="size-4" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-all p-4 text-xs">
        {value}
      </pre>
    </div>
  );
}
