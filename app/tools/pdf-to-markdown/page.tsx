"use client";

import {
  RiCheckLine,
  RiDeleteBin6Line,
  RiDownload2Line,
  RiFileCopyLine,
  RiLoader4Line,
} from "@remixicon/react";
import { marked } from "marked";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PdfDropZone } from "@/components/pdf/pdf-drop-zone";
import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { convertPdfToMarkdown } from "@/lib/pdf/to-markdown";

const COPY_RESET_MS = 2000;

export default function PdfToMarkdownPage() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [detectHeadings, setDetectHeadings] = useState(true);
  const [pageBreaks, setPageBreaks] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleFiles = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setFileName(file.name);
    setLoading(true);
    setError(null);
    setMarkdown("");
    try {
      const buffer = await file.arrayBuffer();
      setBytes(new Uint8Array(buffer));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read file.");
      setBytes(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!bytes) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    convertPdfToMarkdown(bytes, { detectHeadings, pageBreaks })
      .then((result) => {
        if (!cancelled) setMarkdown(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to convert PDF.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bytes, detectHeadings, pageBreaks]);

  const html = useMemo(
    () => (markdown ? (marked.parse(markdown) as string) : ""),
    [markdown],
  );

  const reset = useCallback(() => {
    setFileName(null);
    setBytes(null);
    setMarkdown("");
    setError(null);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!markdown) return;
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), COPY_RESET_MS);
  }, [markdown]);

  const handleDownload = useCallback(() => {
    if (!markdown) return;
    const baseName = (fileName ?? "document").replace(/\.pdf$/i, "");
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [markdown, fileName]);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">PDF to Markdown</h1>
      <p className="text-muted-foreground mt-1">
        Extract text from a PDF and convert it to Markdown. Headings,
        paragraphs, and list items are detected automatically.
      </p>
      <PrivacyBanner>
        Your PDFs are processed entirely in your browser. Nothing is stored,
        logged, or sent to a server.
      </PrivacyBanner>

      <div className="mt-8">
        <PdfDropZone onFiles={handleFiles} compact={!!bytes} />
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {bytes && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={detectHeadings}
                onChange={(e) => setDetectHeadings(e.target.checked)}
                className="size-4 rounded border-input"
              />
              Detect headings from font size
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={pageBreaks}
                onChange={(e) => setPageBreaks(e.target.checked)}
                className="size-4 rounded border-input"
              />
              Insert horizontal rule between pages
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={reset}>
              <RiDeleteBin6Line data-icon="inline-start" />
              Remove PDF
            </Button>

            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={!markdown}
              >
                {copied ? (
                  <RiCheckLine data-icon="inline-start" />
                ) : (
                  <RiFileCopyLine data-icon="inline-start" />
                )}
                {copied ? "Copied!" : "Copy"}
              </Button>
              <Button size="sm" onClick={handleDownload} disabled={!markdown}>
                <RiDownload2Line data-icon="inline-start" />
                Download .md
              </Button>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 py-8">
              <RiLoader4Line className="text-muted-foreground size-5 animate-spin" />
              <span className="text-muted-foreground text-sm">
                Converting…
              </span>
            </div>
          )}

          {!loading && markdown && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="markdown-output">Markdown</Label>
                <Textarea
                  id="markdown-output"
                  value={markdown}
                  readOnly
                  className="min-h-[500px] resize-y font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label>Preview</Label>
                <div
                  className="markdown-preview min-h-[500px] overflow-auto rounded-md border bg-background p-6 text-sm"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </div>
            </div>
          )}

          {!loading && !markdown && !error && (
            <p className="text-muted-foreground text-sm">
              No text was extracted from this PDF. It may be a scanned image or
              contain only non-text content.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
