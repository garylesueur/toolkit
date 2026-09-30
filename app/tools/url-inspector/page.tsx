"use client";

import {
  RiAlertLine,
  RiInformationLine,
  RiSearchEyeLine,
} from "@remixicon/react";
import { useState } from "react";

import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { inspectUrl } from "@/lib/security/url-inspector";
import type { UrlInspection } from "@/lib/security/url-inspector";

const EXAMPLES = [
  "https://example.com/docs",
  "https://trusted.example@evil.test/login",
  "http://192.168.1.10:8080/admin",
  "https://example.com/out?next=https%3A%2F%2Fevil.test",
];

export default function UrlInspectorPage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<UrlInspection | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runInspection = (value: string) => {
    try {
      setResult(inspectUrl(value));
      setError(null);
    } catch (failure) {
      setResult(null);
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not inspect this URL.",
      );
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        Suspicious URL Inspector
      </h1>
      <p className="mt-1 text-muted-foreground">
        Break down a link and flag common structural tricks before visiting it.
      </p>
      <PrivacyBanner>
        The URL is parsed entirely in your browser. This tool never visits the
        address or sends it to a reputation service.
      </PrivacyBanner>
      <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        This is a heuristic explainer, not a malware or phishing scanner. A
        clean result does not mean a link is safe, and a warning does not prove
        it is malicious.
      </div>

      <div className="mt-8 space-y-3">
        <label htmlFor="url-to-inspect" className="sr-only">
          URL to inspect
        </label>
        <Textarea
          id="url-to-inspect"
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            setResult(null);
            setError(null);
          }}
          placeholder="Paste a URL without opening it…"
          className="min-h-24 font-mono"
          autoCapitalize="none"
          spellCheck={false}
        />
        <div className="flex flex-wrap gap-2">
          <Button disabled={!input.trim()} onClick={() => runInspection(input)}>
            <RiSearchEyeLine className="size-4" />
            Inspect URL
          </Button>
          {EXAMPLES.map((example, index) => (
            <Button
              key={example}
              size="sm"
              variant="outline"
              onClick={() => {
                setInput(example);
                runInspection(example);
              }}
            >
              Example {index + 1}
            </Button>
          ))}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {result && (
        <div className="mt-8 space-y-6">
          <div
            className={`rounded-lg border p-4 ${
              result.riskLevel === "High caution"
                ? "border-destructive/30 bg-destructive/5"
                : result.riskLevel === "Caution"
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-green-500/30 bg-green-500/5"
            }`}
          >
            <p className="text-sm text-muted-foreground">Structural result</p>
            <p className="text-xl font-semibold">{result.riskLevel}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              This label describes only the URL structure, not the site&apos;s
              content or reputation.
            </p>
          </div>

          <section>
            <h2 className="text-lg font-semibold">Destination breakdown</h2>
            <dl className="mt-3 rounded-lg border px-4">
              <Detail label="Normalized URL" value={result.normalizedUrl} />
              <Detail label="Scheme" value={result.protocol} />
              <Detail
                label="Hostname"
                value={result.hostname || "None"}
                emphasis
              />
              <Detail label="Port" value={result.port || "Default"} />
              <Detail label="Username" value={result.username || "None"} />
              <Detail
                label="Password"
                value={result.passwordPresent ? "Present (redacted)" : "None"}
              />
              <Detail label="Path" value={result.pathname || "/"} />
            </dl>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Findings</h2>
            {result.findings.length === 0 ? (
              <div className="mt-3 flex gap-2 rounded-lg border p-4 text-sm text-muted-foreground">
                <RiInformationLine className="mt-0.5 size-4 shrink-0" />
                No obvious structural tricks were detected. This is not a safety
                verdict; verify the destination and sender independently.
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {result.findings.map((finding) => (
                  <div
                    key={finding.code}
                    className={`flex gap-3 rounded-lg border p-4 text-sm ${
                      finding.severity === "high"
                        ? "border-destructive/30 bg-destructive/5"
                        : finding.severity === "medium"
                          ? "border-amber-500/30 bg-amber-500/5"
                          : "bg-muted/30"
                    }`}
                  >
                    {finding.severity === "info" ? (
                      <RiInformationLine className="mt-0.5 size-4 shrink-0" />
                    ) : (
                      <RiAlertLine className="mt-0.5 size-4 shrink-0" />
                    )}
                    <div>
                      <p className="font-medium capitalize">
                        {finding.severity === "high"
                          ? "High caution"
                          : finding.severity}
                      </p>
                      <p className="mt-0.5 text-muted-foreground">
                        {finding.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold">Query parameters</h2>
            {result.query.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No query parameters.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {result.query.map((parameter, index) => (
                  <div
                    key={`${parameter.name}-${index}`}
                    className="grid gap-1 rounded-lg border p-3 sm:grid-cols-[12rem_1fr]"
                  >
                    <span className="break-all font-mono text-sm font-medium">
                      {parameter.name || "(empty name)"}
                    </span>
                    <span className="break-all font-mono text-sm text-muted-foreground">
                      {parameter.value || "(empty value)"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Detail({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="grid gap-1 border-b py-3 last:border-b-0 sm:grid-cols-[12rem_1fr]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={`break-all font-mono text-sm ${emphasis ? "font-semibold" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
