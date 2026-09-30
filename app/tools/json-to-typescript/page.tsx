"use client";

import {
  RiCheckLine,
  RiFileCopyLine,
  RiFileDownloadLine,
} from "@remixicon/react";
import { useMemo, useState } from "react";

import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { generateTypescript } from "@/lib/text/json-to-typescript";

const EXAMPLE = `{
  "users": [
    {
      "id": 1,
      "name": "Ada",
      "roles": ["admin", "editor"],
      "profile": { "verified": true, "bio": null }
    },
    {
      "id": 2,
      "name": "Grace",
      "email": "grace@example.test",
      "roles": ["viewer"],
      "profile": { "verified": false, "bio": "Compiler pioneer" }
    }
  ],
  "nextPage": null
}`;

export default function JsonToTypescriptPage() {
  const [input, setInput] = useState(EXAMPLE);
  const [rootName, setRootName] = useState("ApiResponse");
  const [readonlyFields, setReadonlyFields] = useState(false);
  const [exportTypes, setExportTypes] = useState(true);
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    try {
      return {
        error: null,
        output: generateTypescript(input, {
          exportTypes,
          readonlyFields,
          rootName,
        }),
      };
    } catch (failure) {
      return {
        error:
          failure instanceof Error
            ? failure.message
            : "The JSON could not be converted.",
        output: "",
      };
    }
  }, [exportTypes, input, readonlyFields, rootName]);

  const copyOutput = async () => {
    await navigator.clipboard.writeText(result.output);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const download = () => {
    const url = URL.createObjectURL(
      new Blob([result.output], { type: "text/typescript" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${rootName || "types"}.ts`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">JSON to TypeScript</h1>
      <p className="mt-1 text-muted-foreground">
        Infer TypeScript interfaces and type aliases from a JSON example.
      </p>
      <PrivacyBanner>
        Your JSON is parsed entirely in this browser and is never uploaded.
      </PrivacyBanner>
      <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        Generated types describe only the supplied sample, not every response
        your API may return. Review optional fields, unions, dates, enums, and
        business rules against the real contract.
      </div>

      <section className="mt-8 grid gap-4 rounded-lg border p-4 sm:grid-cols-3">
        <label
          className="space-y-1 text-xs font-medium"
          htmlFor="root-type-name"
        >
          Root type name
          <Input
            id="root-type-name"
            value={rootName}
            onChange={(event) => setRootName(event.target.value)}
            placeholder="ApiResponse"
          />
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input
            type="checkbox"
            checked={exportTypes}
            onChange={(event) => setExportTypes(event.target.checked)}
          />
          Add export keywords
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input
            type="checkbox"
            checked={readonlyFields}
            onChange={(event) => setReadonlyFields(event.target.checked)}
          />
          Readonly fields
        </label>
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="json-type-input" className="text-sm font-medium">
              JSON input
            </label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setInput(EXAMPLE)}
              >
                Example
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setInput("")}>
                Clear
              </Button>
            </div>
          </div>
          <Textarea
            id="json-type-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="min-h-[32rem] font-mono text-xs"
            autoCapitalize="none"
            spellCheck={false}
          />
          {result.error && (
            <p className="mt-2 text-xs text-destructive">{result.error}</p>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium">TypeScript output</h2>
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
                Download .ts
              </Button>
            </div>
          </div>
          <pre className="min-h-[32rem] overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 font-mono text-xs">
            {result.output || "Valid TypeScript appears here as you type."}
          </pre>
          {result.output && (
            <p className="mt-2 text-xs text-muted-foreground">
              {(result.output.match(/\binterface\b/g) ?? []).length} interfaces
              · {(result.output.match(/\btype\b/g) ?? []).length} type aliases
            </p>
          )}
        </div>
      </section>

      <section className="mt-8 rounded-lg border p-4 text-sm text-muted-foreground">
        <h2 className="font-semibold text-foreground">Inference rules</h2>
        <p className="mt-1">
          Missing keys across objects in the same array become optional. Mixed
          values become unions, empty arrays use <code>unknown[]</code>, nested
          objects receive named interfaces, and invalid property names are
          quoted.
        </p>
      </section>
    </div>
  );
}
