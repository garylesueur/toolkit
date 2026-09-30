"use client";

import {
  RiCloseLine,
  RiDownload2Line,
  RiFileTextLine,
  RiFontSize,
  RiLoader4Line,
} from "@remixicon/react";
import { downloadZip } from "client-zip";
import { useCallback, useMemo, useRef, useState } from "react";

import { PdfDropZone } from "@/components/pdf/pdf-drop-zone";
import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePdfDocument } from "@/hooks/use-pdf-document";
import {
  extractPdfFonts,
  type ExtractedPdfFont,
} from "@/lib/pdf/extract-fonts";
import {
  MAX_FONT_EXTRACTION_PAGES,
  resolveFontExtractionPages,
} from "@/lib/pdf/extract-fonts-options";
import type { PdfImageExtractionStage } from "@/lib/pdf/extract-images";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fontBlob(font: ExtractedPdfFont): Blob {
  return new Blob([font.bytes.slice().buffer], { type: font.mimeType });
}

function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function baseName(fileName: string | null): string {
  return (fileName ?? "document").replace(/\.pdf$/i, "");
}

function stageDetails(stage: PdfImageExtractionStage | null): {
  label: string;
  percent: number;
} {
  if (stage === "extracting") {
    return {
      label: "Extracting embedded TrueType font programs…",
      percent: 68,
    };
  }
  if (stage === "collecting") {
    return { label: "Checking and collecting local font files…", percent: 94 };
  }
  return { label: "Loading the local PDF font engine…", percent: 18 };
}

export default function ExtractPdfFontsPage() {
  const {
    pdfBytes,
    pageCount,
    fileName,
    loading,
    error: loadError,
    loadFile,
    reset,
  } = usePdfDocument({ renderThumbnails: false });
  const [pages, setPages] = useState("");
  const [working, setWorking] = useState(false);
  const [stage, setStage] = useState<PdfImageExtractionStage | null>(null);
  const [fonts, setFonts] = useState<ExtractedPdfFont[]>([]);
  const [hasRun, setHasRun] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const range = useMemo(() => {
    if (!pageCount)
      return { pages: [] as number[], error: null as string | null };
    try {
      return {
        pages: resolveFontExtractionPages(pages, pageCount),
        error: null,
      };
    } catch (cause) {
      return {
        pages: [] as number[],
        error: cause instanceof Error ? cause.message : "Invalid page range.",
      };
    }
  }, [pageCount, pages]);

  const invalidate = useCallback(() => {
    setFonts([]);
    setHasRun(false);
    setError(null);
  }, []);

  const handleReset = useCallback(() => {
    abortRef.current?.abort();
    reset();
    setPages("");
    setWorking(false);
    setStage(null);
    invalidate();
  }, [invalidate, reset]);

  const handleExtract = useCallback(async () => {
    if (!pdfBytes || range.error || !range.pages.length) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setWorking(true);
    setStage("loading-engine");
    setFonts([]);
    setHasRun(false);
    setError(null);
    try {
      setFonts(
        await extractPdfFonts(pdfBytes, range.pages, {
          signal: controller.signal,
          onStage: setStage,
        }),
      );
      setHasRun(true);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") {
        setError("Font extraction cancelled.");
      } else {
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not extract fonts from this PDF.",
        );
      }
    } finally {
      abortRef.current = null;
      setWorking(false);
      setStage(null);
    }
  }, [pdfBytes, range]);

  const handleDownloadAll = useCallback(async () => {
    if (!fonts.length) return;
    if (fonts.length === 1) {
      downloadBlob(fontBlob(fonts[0]), fonts[0].name);
      return;
    }
    const zip = await downloadZip(
      fonts.map((font) => ({ name: font.name, input: fontBlob(font) })),
    ).blob();
    downloadBlob(zip, `${baseName(fileName)}-extracted-fonts.zip`);
  }, [fileName, fonts]);

  const progress = stageDetails(stage);
  const totalBytes = fonts.reduce((total, font) => total + font.size, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Extract PDF Fonts</h1>
      <p className="mt-1 text-muted-foreground">
        Recover embedded TrueType font programs from selected PDF pages.
      </p>
      <PrivacyBanner>
        Your PDF is processed by a disposable WebAssembly worker in this
        browser. The PDF and extracted font files are never uploaded.
      </PrivacyBanner>

      <div className="mt-4 space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-6">
        <p>
          <strong>Copyright still applies.</strong> Embedding a font in a PDF
          does not grant permission to install, reuse, or redistribute it. Check
          the document owner&apos;s font licence first.
        </p>
        <p>
          Extracted files may contain only a subset of the original glyphs.
          Standard PDF fonts and non-TrueType formats may have no extractable
          file. Treat unknown font files as untrusted and do not install them
          automatically.
        </p>
      </div>

      <div className="mt-8">
        <PdfDropZone
          compact={!!pdfBytes}
          label={pdfBytes ? "Choose a different PDF" : undefined}
          onFiles={(files) => {
            handleReset();
            void loadFile(files[0]);
          }}
        />
      </div>

      {loading && (
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <RiLoader4Line className="size-5 animate-spin" aria-hidden />
          Reading local PDF structure…
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
              <p className="mt-1 text-xs text-muted-foreground">
                {pageCount} {pageCount === 1 ? "page" : "pages"} · maximum{" "}
                {MAX_FONT_EXTRACTION_PAGES} per run
              </p>
            </div>
            <div>
              <Label htmlFor="extract-font-pages">Pages</Label>
              <Input
                id="extract-font-pages"
                value={pages}
                disabled={working}
                placeholder={`All pages, or e.g. 1-${Math.min(pageCount, 5)}`}
                className="mt-1"
                onChange={(event) => {
                  setPages(event.target.value);
                  invalidate();
                }}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Leave blank for all pages, or use 1-3, 5.
              </p>
              {range.error && (
                <p className="mt-1 text-xs text-destructive">{range.error}</p>
              )}
            </div>
          </div>

          {working && (
            <output className="block overflow-hidden rounded-lg border bg-muted/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium">
                <span className="flex items-center gap-2">
                  <RiLoader4Line className="size-5 animate-spin text-primary" />
                  {progress.label}
                </span>
                <span className="tabular-nums">{progress.percent}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full animate-pulse rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => abortRef.current?.abort()}
                >
                  Cancel extraction
                </Button>
              </div>
            </output>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {hasRun && fonts.length === 0 && (
            <div className="rounded-lg border p-5 text-sm text-muted-foreground">
              No extractable embedded TrueType fonts were found on the selected
              pages. The PDF may use standard fonts, outlines, or unsupported
              font formats.
            </div>
          )}

          {fonts.length > 0 && (
            <>
              <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-5">
                <div>
                  <p className="font-medium">Embedded fonts extracted</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {fonts.length} {fonts.length === 1 ? "font" : "fonts"} ·{" "}
                    {formatBytes(totalBytes)} total
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => void handleDownloadAll()}
                >
                  <RiDownload2Line data-icon="inline-start" />
                  {fonts.length === 1 ? "Download font" : "Download ZIP"}
                </Button>
              </section>
              <div className="space-y-3">
                {fonts.map((font) => (
                  <article
                    key={`${font.name}-${font.size}`}
                    className="flex flex-wrap items-center gap-3 rounded-lg border p-4"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <RiFontSize className="size-5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-sm font-medium"
                        title={font.name}
                      >
                        {font.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        TrueType · {formatBytes(font.size)}
                        {font.subset ? " · likely subset" : ""}
                      </p>
                    </div>
                    {font.subset && (
                      <span className="rounded-md bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-600 dark:text-amber-500">
                        Likely subset
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadBlob(fontBlob(font), font.name)}
                    >
                      <RiDownload2Line data-icon="inline-start" />
                      Download
                    </Button>
                  </article>
                ))}
              </div>
            </>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" disabled={working} onClick={handleReset}>
              <RiCloseLine data-icon="inline-start" />
              Remove PDF
            </Button>
            <Button
              disabled={working || !!range.error || !range.pages.length}
              onClick={() => void handleExtract()}
            >
              {working ? (
                <RiLoader4Line
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <RiFileTextLine data-icon="inline-start" />
              )}
              {working ? "Extracting…" : "Extract embedded fonts"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
