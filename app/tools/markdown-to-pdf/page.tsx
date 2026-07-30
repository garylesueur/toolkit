"use client";

import {
  RiAlertLine,
  RiDownload2Line,
  RiFileTextLine,
  RiLoader4Line,
} from "@remixicon/react";
import { useCallback, useRef, useState } from "react";

import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSanitisedMarkdown } from "@/hooks/use-sanitised-markdown";
import { generateMarkdownPdf } from "@/lib/markdown-pdf/generate-client";
import type {
  MarkdownPdfOptions,
  PageSizeId,
  ThemeId,
} from "@/lib/markdown-pdf/types";
import { DEFAULT_OPTIONS, THEME_SUMMARIES } from "@/lib/markdown-pdf/types";

const SAMPLE_MARKDOWN = `# Quarterly Report

A short sample showing what survives the trip to PDF. Replace it with your own.

## Formatting

Text can be **bold**, *italic*, ~~struck through~~, or \`inline code\`, and can
link to [somewhere useful](https://toolkit.lesueur.uk).

### Lists

1. Ordered items keep their numbers
2. Nested items indent:
   - like this
   - and this
3. Back to the top level

- [x] Task lists render with checkboxes
- [ ] Including unchecked ones

## Tables

| Region | Revenue | Change |
| ------ | ------: | :----: |
| EMEA   | £412,000 | +12% |
| AMER   | £988,500 | +4%  |
| APAC   | £201,300 | −2%  |

## Code

\`\`\`typescript
export function total(rows: Row[]): number {
  return rows.reduce((sum, row) => sum + row.revenue, 0);
}
\`\`\`

> Blockquotes are indented with a rule down the left-hand side.

---

That's the lot.
`;

export default function MarkdownToPdfPage() {
  const [markdown, setMarkdown] = useState(SAMPLE_MARKDOWN);
  const [options, setOptions] = useState<MarkdownPdfOptions>({
    ...DEFAULT_OPTIONS,
    title: "Quarterly Report",
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const html = useSanitisedMarkdown(markdown);

  const setOption = useCallback(
    <K extends keyof MarkdownPdfOptions>(
      key: K,
      value: MarkdownPdfOptions[K],
    ) => {
      setOptions((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const handleDownload = useCallback(async () => {
    setGenerating(true);
    setError(null);
    setWarnings([]);

    try {
      const result = await generateMarkdownPdf(markdown, options);
      setWarnings(result.warnings);

      const blob = new Blob([result.bytes as BlobPart], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${slugifyFilename(options.title) || "document"}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Could not generate the PDF.",
      );
    } finally {
      setGenerating(false);
    }
  }, [markdown, options]);

  const handleFile = useCallback(async (file: File) => {
    const text = await file.text();
    setMarkdown(text);
    setOptions((current) => ({
      ...current,
      title: file.name.replace(/\.(md|markdown|txt)$/i, ""),
    }));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Markdown to PDF</h1>
      <p className="text-muted-foreground mt-1">
        Turn GitHub-flavoured Markdown into a typeset PDF — tables, task lists,
        code blocks, and all. Pick a theme to change the fonts and colours.
      </p>
      <PrivacyBanner>
        The PDF is generated entirely in your browser. Your Markdown is never
        uploaded anywhere.
      </PrivacyBanner>

      <div className="mt-8 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="md-theme">Theme</Label>
            <Select
              value={options.theme}
              onValueChange={(value) => setOption("theme", value as ThemeId)}
            >
              <SelectTrigger id="md-theme" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {THEME_SUMMARIES.map((theme) => (
                  <SelectItem key={theme.id} value={theme.id}>
                    {theme.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="md-page-size">Page size</Label>
            <Select
              value={options.pageSize}
              onValueChange={(value) =>
                setOption("pageSize", value as PageSizeId)
              }
            >
              <SelectTrigger id="md-page-size" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A4">A4</SelectItem>
                <SelectItem value="LETTER">US Letter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="md-title">Document title</Label>
            <Input
              id="md-title"
              value={options.title}
              onChange={(e) => setOption("title", e.target.value)}
              placeholder="Shown in the footer and used as the filename"
            />
          </div>
        </div>

        <p className="text-muted-foreground text-sm">
          {
            THEME_SUMMARIES.find((theme) => theme.id === options.theme)
              ?.description
          }
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={options.includePageNumbers}
              onChange={(e) =>
                setOption("includePageNumbers", e.target.checked)
              }
              className="size-4 rounded border-input"
            />
            Footer with page numbers
          </label>

          <div className="ml-auto flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              aria-label="Open a Markdown file"
              accept=".md,.markdown,.txt,text/markdown,text/plain"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = "";
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <RiFileTextLine data-icon="inline-start" />
              Open .md file
            </Button>
            <Button
              size="sm"
              onClick={handleDownload}
              disabled={generating || markdown.trim().length === 0}
            >
              {generating ? (
                <RiLoader4Line
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <RiDownload2Line data-icon="inline-start" />
              )}
              {generating ? "Generating…" : "Download PDF"}
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <RiAlertLine className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="text-sm font-medium text-destructive">{error}</p>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium">
              The PDF was generated with some caveats:
            </p>
            <ul className="text-muted-foreground mt-1 list-disc space-y-0.5 pl-5 text-sm">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="md-source">Markdown</Label>
            <Textarea
              id="md-source"
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              className="min-h-[560px] resize-y font-mono text-sm"
              spellCheck={false}
            />
          </div>

          <div className="space-y-2">
            <Label>Preview</Label>
            <div
              className="markdown-preview min-h-[560px] overflow-auto rounded-md border bg-background p-6 text-sm"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </div>

        <p className="text-muted-foreground text-xs">
          The preview above is HTML — the PDF is laid out separately, so page
          breaks and spacing will differ. Only inline <code>data:</code> images
          are embedded; remote images are listed as skipped.
        </p>
      </div>
    </div>
  );
}

function slugifyFilename(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
