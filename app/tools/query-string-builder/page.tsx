"use client";

import {
  RiAddLine,
  RiArrowDownLine,
  RiArrowUpLine,
  RiCheckLine,
  RiDeleteBin6Line,
  RiFileCopyLine,
  RiLinksLine,
} from "@remixicon/react";
import { useMemo, useState } from "react";

import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  buildUrlQuery,
  moveQueryParameter,
  parseUrlQuery,
} from "@/lib/url/query-builder";
import type { QueryParameter } from "@/lib/url/query-builder";

type EditableParameter = QueryParameter & { id: number };

const EXAMPLE =
  "https://example.com/search?q=browser+tools&q=pdf&debug&empty=#results";

export default function QueryStringBuilderPage() {
  const [input, setInput] = useState(EXAMPLE);
  const [base, setBase] = useState("");
  const [fragment, setFragment] = useState("");
  const [parameters, setParameters] = useState<EditableParameter[]>([]);
  const [sourceType, setSourceType] = useState<string | null>(null);
  const [nextId, setNextId] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const output = useMemo(
    () => buildUrlQuery(base, parameters, fragment),
    [base, fragment, parameters],
  );

  const parse = (value: string) => {
    try {
      const parsed = parseUrlQuery(value);
      setBase(parsed.base);
      setFragment(parsed.fragment);
      setParameters(
        parsed.parameters.map((parameter, index) => ({
          ...parameter,
          id: index,
        })),
      );
      setNextId(parsed.parameters.length);
      setSourceType(parsed.sourceType);
      setError(null);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "The input could not be parsed.",
      );
    }
  };

  const addParameter = () => {
    setParameters((current) => [
      ...current,
      { hasEquals: true, id: nextId, name: "", value: "" },
    ]);
    setNextId((current) => current + 1);
  };

  const updateParameter = (id: number, update: Partial<QueryParameter>) => {
    setParameters((current) =>
      current.map((parameter) =>
        parameter.id === id ? { ...parameter, ...update } : parameter,
      ),
    );
  };

  const move = (index: number, target: number) => {
    setParameters(
      (current) =>
        moveQueryParameter(current, index, target) as EditableParameter[],
    );
  };

  const copyOutput = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        URL & Query String Builder
      </h1>
      <p className="mt-1 text-muted-foreground">
        Parse, edit, reorder, and rebuild URL query parameters without visiting
        the address.
      </p>
      <PrivacyBanner>
        URLs are parsed entirely in your browser. This tool never requests or
        opens the address.
      </PrivacyBanner>

      <section className="mt-8 space-y-3">
        <label htmlFor="url-query-input" className="text-sm font-medium">
          URL or query string
        </label>
        <Textarea
          id="url-query-input"
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            setError(null);
          }}
          className="min-h-24 font-mono text-sm"
          placeholder="https://example.com/search?q=tools or q=tools&sort=new"
          autoCapitalize="none"
          spellCheck={false}
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => parse(input)}>
            <RiLinksLine className="size-4" />
            Parse
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setInput(EXAMPLE);
              parse(EXAMPLE);
            }}
          >
            Load example
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </section>

      {sourceType && (
        <>
          <section className="mt-8 grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
            <label
              htmlFor="query-base"
              className="space-y-1 text-xs font-medium"
            >
              Base URL or path
              <Input
                id="query-base"
                value={base}
                onChange={(event) => setBase(event.target.value)}
                placeholder="Optional for a query string"
                className="font-mono"
                spellCheck={false}
              />
            </label>
            <label
              htmlFor="query-fragment"
              className="space-y-1 text-xs font-medium"
            >
              Fragment (without #)
              <Input
                id="query-fragment"
                value={fragment}
                onChange={(event) => setFragment(event.target.value)}
                placeholder="section-name"
                className="font-mono"
                spellCheck={false}
              />
            </label>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Parsed as {sourceType.replaceAll("-", " ")} · {parameters.length}{" "}
              {parameters.length === 1 ? "parameter" : "parameters"}
            </p>
          </section>

          <section className="mt-8">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Parameters</h2>
              <Button size="sm" variant="outline" onClick={addParameter}>
                <RiAddLine className="size-4" />
                Add parameter
              </Button>
            </div>
            {parameters.length === 0 ? (
              <p className="mt-3 rounded-lg border p-4 text-sm text-muted-foreground">
                No query parameters yet.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {parameters.map((parameter, index) => (
                  <div
                    key={parameter.id}
                    className="grid gap-2 rounded-lg border p-3 lg:grid-cols-[1fr_1fr_auto_auto]"
                  >
                    <label
                      htmlFor={`parameter-name-${parameter.id}`}
                      className="space-y-1 text-xs font-medium"
                    >
                      Name
                      <Input
                        id={`parameter-name-${parameter.id}`}
                        value={parameter.name}
                        onChange={(event) =>
                          updateParameter(parameter.id, {
                            name: event.target.value,
                          })
                        }
                        className="font-mono"
                        spellCheck={false}
                      />
                    </label>
                    <label
                      htmlFor={`parameter-value-${parameter.id}`}
                      className="space-y-1 text-xs font-medium"
                    >
                      Value
                      <Input
                        id={`parameter-value-${parameter.id}`}
                        value={parameter.value}
                        disabled={!parameter.hasEquals}
                        onChange={(event) =>
                          updateParameter(parameter.id, {
                            value: event.target.value,
                          })
                        }
                        className="font-mono"
                        spellCheck={false}
                      />
                    </label>
                    <label className="flex items-center gap-2 self-end pb-2 text-xs">
                      <input
                        type="checkbox"
                        checked={!parameter.hasEquals}
                        onChange={(event) =>
                          updateParameter(parameter.id, {
                            hasEquals: !event.target.checked,
                            value: event.target.checked ? "" : parameter.value,
                          })
                        }
                      />
                      Bare flag
                    </label>
                    <div className="flex self-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={index === 0}
                        aria-label={`Move ${parameter.name || "parameter"} up`}
                        onClick={() => move(index, index - 1)}
                      >
                        <RiArrowUpLine className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={index === parameters.length - 1}
                        aria-label={`Move ${parameter.name || "parameter"} down`}
                        onClick={() => move(index, index + 1)}
                      >
                        <RiArrowDownLine className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Remove ${parameter.name || "parameter"}`}
                        onClick={() =>
                          setParameters((current) =>
                            current.filter((item) => item.id !== parameter.id),
                          )
                        }
                      >
                        <RiDeleteBin6Line className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-8 overflow-hidden rounded-lg border">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-2">
              <h2 className="text-sm font-medium">
                Rebuilt URL or query string
              </h2>
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
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap break-all p-4 font-mono text-sm">
              {output || "Add a base, parameter, or fragment."}
            </pre>
          </section>

          <p className="mt-3 text-xs text-muted-foreground">
            Spaces in query parameters are encoded as <code>+</code>. Duplicate
            names and parameter order are preserved. Use Suspicious URL
            Inspector separately when you need structural safety warnings.
          </p>
        </>
      )}
    </div>
  );
}
