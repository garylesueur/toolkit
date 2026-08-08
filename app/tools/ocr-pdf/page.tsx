"use client";

import {
  RiAlertLine,
  RiCharacterRecognitionLine,
  RiCheckboxCircleLine,
  RiDownload2Line,
  RiFileTextLine,
  RiLoader4Line,
} from "@remixicon/react";
import { useCallback, useMemo, useRef, useState } from "react";

import { PdfDropZone } from "@/components/pdf/pdf-drop-zone";
import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { usePdfDocument } from "@/hooks/use-pdf-document";
import { downloadPdfBytes } from "@/lib/pdf/download";
import {
  recognisePdf,
  type OcrProgress,
  type PdfOcrResult,
} from "@/lib/pdf/ocr";
import { MAX_OCR_PAGES, resolveOcrPages } from "@/lib/pdf/ocr-options";

function downloadText(text: string, fileName: string): void {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function progressPercent(progress: OcrProgress | null): number {
  if (!progress) return 0;
  if (progress.stage === "loading-document") return 2;
  if (progress.stage === "loading-engine") {
    return 5 + (progress.engineProgress ?? 0) * 15;
  }
  if (progress.stage === "assembling") return 98;
  if (!progress.total) return 20;
  return (
    20 +
    ((progress.completed + (progress.engineProgress ?? 0)) / progress.total) *
      76
  );
}

function progressLabel(progress: OcrProgress | null): string {
  if (!progress) return "Preparing local OCR…";
  if (progress.stage === "loading-document") return "Loading PDF locally…";
  if (progress.stage === "loading-engine") {
    return progress.engineStatus
      ? `Loading English OCR: ${progress.engineStatus}…`
      : "Loading the self-hosted English OCR engine…";
  }
  if (progress.stage === "assembling") {
    return "Adding the invisible searchable text layer…";
  }
  return progress.pageNumber
    ? `Recognising page ${progress.pageNumber} · ${progress.completed} of ${progress.total} complete…`
    : "Recognising printed text…";
}

export default function OcrPdfPage() {
  const {
    pdfBytes,
    pageCount,
    fileName,
    loading,
    error: loadError,
    loadFile,
    reset,
  } = usePdfDocument();
  const [pages, setPages] = useState("");
  const [skipTextPages, setSkipTextPages] = useState(true);
  const [createSearchablePdf, setCreateSearchablePdf] = useState(true);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState<OcrProgress | null>(null);
  const [result, setResult] = useState<PdfOcrResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const rangeError = useMemo(() => {
    if (!pageCount) return null;
    try {
      resolveOcrPages(pages, pageCount);
      return null;
    } catch (cause) {
      return cause instanceof Error ? cause.message : "Invalid page range.";
    }
  }, [pageCount, pages]);

  const invalidate = useCallback(() => {
    setResult(null);
    setError(null);
    setCopied(false);
  }, []);

  const handleReset = useCallback(() => {
    abortRef.current?.abort();
    reset();
    setPages("");
    setWorking(false);
    setProgress(null);
    setResult(null);
    setError(null);
    setCopied(false);
  }, [reset]);

  const handleOcr = useCallback(async () => {
    if (!pdfBytes || rangeError) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setWorking(true);
    setProgress(null);
    setResult(null);
    setError(null);
    setCopied(false);
    try {
      setResult(
        await recognisePdf(
          pdfBytes,
          {
            pages,
            skipTextPages,
            createSearchablePdf,
            signal: controller.signal,
          },
          setProgress,
        ),
      );
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError")) {
        setError(cause instanceof Error ? cause.message : "PDF OCR failed.");
      }
    } finally {
      abortRef.current = null;
      setWorking(false);
      setProgress(null);
    }
  }, [createSearchablePdf, pages, pdfBytes, rangeError, skipTextPages]);

  const baseName = (fileName ?? "document").replace(/\.pdf$/i, "");
  const wordCount =
    result?.pages.reduce((sum, page) => sum + page.wordCount, 0) ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">OCR PDF</h1>
      <p className="text-muted-foreground mt-1">
        Extract English printed text and optionally add a searchable layer to
        scanned PDF pages.
      </p>
      <PrivacyBanner>
        PDF rendering, OCR, and searchable-PDF creation happen in this browser.
        The worker, WASM core, and English model are self-hosted; no CDN or OCR
        service receives your document.
      </PrivacyBanner>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-4">
          <div className="flex items-start gap-3">
            <RiCharacterRecognitionLine
              className="mt-0.5 size-5 shrink-0 text-sky-500"
              aria-hidden
            />
            <div>
              <p className="text-sm font-medium">English printed text</p>
              <p className="text-muted-foreground mt-1 text-xs leading-5">
                The first run loads roughly 7 MB of local OCR assets and caches
                the English model in this browser. Handwriting and decorative
                fonts are not reliable.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-start gap-3">
            <RiAlertLine
              className="mt-0.5 size-5 shrink-0 text-amber-500"
              aria-hidden
            />
            <div>
              <p className="text-sm font-medium">Review important text</p>
              <p className="text-muted-foreground mt-1 text-xs leading-5">
                OCR is probabilistic and can misread names, numbers, and tables.
                Confidence is a clue, not proof of accuracy.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <PdfDropZone
          compact={!!pdfBytes}
          label={pdfBytes ? "Choose a different PDF" : "Choose a scanned PDF"}
          onFiles={(files) => {
            handleReset();
            void loadFile(files[0]);
          }}
        />
      </div>

      {loading && (
        <div className="text-muted-foreground mt-6 flex items-center justify-center gap-2 text-sm">
          <RiLoader4Line className="size-5 animate-spin" aria-hidden />
          Reading local PDF pages…
        </div>
      )}
      {loadError && (
        <p className="mt-4 text-sm text-destructive">{loadError}</p>
      )}

      {pdfBytes && pageCount > 0 && (
        <div className="mt-6 space-y-5">
          <div className="grid gap-4 rounded-lg border p-5 sm:grid-cols-2">
            <div>
              <p className="truncate text-sm font-medium">{fileName}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {pageCount} {pageCount === 1 ? "page" : "pages"} · maximum{" "}
                {MAX_OCR_PAGES} per run
              </p>
            </div>
            <div>
              <Label htmlFor="ocr-pages">Pages</Label>
              <input
                id="ocr-pages"
                value={pages}
                disabled={working}
                placeholder={`All pages, or e.g. 1-${Math.min(pageCount, 5)}`}
                className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                onChange={(event) => {
                  setPages(event.target.value);
                  invalidate();
                }}
              />
              <p className="text-muted-foreground mt-1 text-xs">
                Leave blank for all pages, or use 1-3, 5.
              </p>
              {rangeError && (
                <p className="mt-1 text-xs text-destructive">{rangeError}</p>
              )}
            </div>

            <label className="flex items-start gap-3 rounded-lg border p-4">
              <input
                type="checkbox"
                aria-label="Skip existing text layers"
                checked={skipTextPages}
                disabled={working}
                className="mt-0.5 size-4 accent-primary"
                onChange={(event) => {
                  setSkipTextPages(event.target.checked);
                  invalidate();
                }}
              />
              <span>
                <span className="block text-sm font-medium">
                  Skip existing text layers
                </span>
                <span className="text-muted-foreground mt-1 block text-xs">
                  Avoid duplicate text on pages that are already searchable.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-lg border p-4">
              <input
                type="checkbox"
                aria-label="Create searchable PDF copy"
                checked={createSearchablePdf}
                disabled={working}
                className="mt-0.5 size-4 accent-primary"
                onChange={(event) => {
                  setCreateSearchablePdf(event.target.checked);
                  invalidate();
                }}
              />
              <span>
                <span className="block text-sm font-medium">
                  Create searchable PDF copy
                </span>
                <span className="text-muted-foreground mt-1 block text-xs">
                  Preserve original page appearance and add invisible word
                  positions behind it.
                </span>
              </span>
            </label>
          </div>

          {working && (
            <output className="block overflow-hidden rounded-lg border bg-muted/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium">
                <span className="flex items-center gap-2">
                  <RiLoader4Line className="size-5 animate-spin text-primary" />
                  {progressLabel(progress)}
                </span>
                <span className="tabular-nums">
                  {Math.round(progressPercent(progress))}%
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progressPercent(progress)}%` }}
                />
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => abortRef.current?.abort()}
                >
                  Cancel OCR
                </Button>
              </div>
            </output>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {result && (
            <div className="space-y-5">
              <section className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-5">
                <div className="flex items-start gap-3">
                  <RiCheckboxCircleLine
                    className="mt-0.5 size-5 shrink-0 text-emerald-500"
                    aria-hidden
                  />
                  <div>
                    <p className="font-medium">Local OCR complete</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {result.recognisedPages} recognised ·{" "}
                      {result.skippedPages} skipped · {wordCount} words
                      {result.averageConfidence === null
                        ? ""
                        : ` · ${result.averageConfidence.toFixed(1)}% average confidence`}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-lg border p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-semibold">Recognised text</h2>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await navigator.clipboard.writeText(result.text);
                        setCopied(true);
                      }}
                    >
                      {copied ? "Copied" : "Copy text"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        downloadText(result.text, `${baseName}-ocr.txt`)
                      }
                    >
                      <RiFileTextLine data-icon="inline-start" />
                      Download text
                    </Button>
                    {result.searchablePdf && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          downloadPdfBytes(
                            result.searchablePdf!,
                            `${baseName}-searchable.pdf`,
                          )
                        }
                      >
                        <RiDownload2Line data-icon="inline-start" />
                        Download searchable PDF
                      </Button>
                    )}
                  </div>
                </div>
                <textarea
                  readOnly
                  value={result.text}
                  aria-label="Recognised PDF text"
                  className="mt-4 min-h-72 w-full resize-y rounded-md border bg-muted/20 p-3 font-mono text-sm leading-6"
                />
              </section>

              <section className="rounded-lg border p-5">
                <h2 className="font-semibold">Page results</h2>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-muted-foreground text-xs">
                      <tr>
                        <th className="pb-2 pr-4 font-medium">Page</th>
                        <th className="pb-2 pr-4 font-medium">Status</th>
                        <th className="pb-2 pr-4 font-medium">Words</th>
                        <th className="pb-2 font-medium">Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.pages.map((page) => (
                        <tr key={page.pageNumber} className="border-t">
                          <td className="py-2 pr-4 tabular-nums">
                            {page.pageNumber}
                          </td>
                          <td className="py-2 pr-4">
                            {page.skipped
                              ? "Existing text skipped"
                              : "Recognised"}
                          </td>
                          <td className="py-2 pr-4 tabular-nums">
                            {page.wordCount}
                          </td>
                          <td className="py-2 tabular-nums">
                            {page.confidence === null
                              ? "—"
                              : `${page.confidence.toFixed(1)}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleReset} disabled={working}>
              Remove PDF
            </Button>
            {!working && (
              <Button onClick={handleOcr} disabled={!!rangeError}>
                <RiCharacterRecognitionLine data-icon="inline-start" />
                Run local OCR
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
