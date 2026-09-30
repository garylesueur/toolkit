"use client";

import {
  RiAlertLine,
  RiArrowRightLine,
  RiCheckLine,
  RiDeleteBin6Line,
  RiDownload2Line,
  RiFileReduceLine,
  RiLoader4Line,
} from "@remixicon/react";
import { useCallback, useRef, useState } from "react";

import { PdfDropZone } from "@/components/pdf/pdf-drop-zone";
import { PrivacyBanner } from "@/components/privacy-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { compressPdf } from "@/lib/pdf/compress";
import type { CompressResult, CompressStage } from "@/lib/pdf/compress";
import { downloadPdfBytes } from "@/lib/pdf/download";
import { strongCompressPdf } from "@/lib/pdf/strong-compress";
import type {
  StrongCompressProgress,
  StrongCompressResult,
} from "@/lib/pdf/strong-compress";
import {
  STRONG_COMPRESSION_LOSSES,
  STRONG_COMPRESSION_PRESETS,
} from "@/lib/pdf/strong-compress-options";
import type { StrongCompressionPreset } from "@/lib/pdf/strong-compress-options";

type CompressionMode = "lossless" | "strong";
type CompressionResult =
  | (CompressResult & { mode: "lossless"; savedPercent: number })
  | (StrongCompressResult & { mode: "strong" });

type ProgressView = {
  label: string;
  percent: number;
  detail: string;
};

const LOSSLESS_STAGE_DETAILS: Record<
  CompressStage,
  { label: string; percent: number }
> = {
  "loading-engine": { label: "Loading the compression engine…", percent: 20 },
  "optimising": { label: "Optimising PDF resources…", percent: 68 },
  "verifying": { label: "Verifying the result…", percent: 100 },
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function strongProgressView(progress: StrongCompressProgress): ProgressView {
  if (progress.stage === "loading-document") {
    return {
      label: "Loading the PDF locally…",
      percent: 10,
      detail: "Preparing pages for local rendering.",
    };
  }
  if (progress.stage === "rendering") {
    const ratio = progress.total ? progress.completed / progress.total : 0;
    return {
      label: `Rendering page ${progress.pageNumber} of ${progress.total}…`,
      percent: 12 + Math.round(ratio * 73),
      detail: `${progress.completed} of ${progress.total} pages flattened and compressed.`,
    };
  }
  if (progress.stage === "assembling") {
    return {
      label: "Assembling compressed pages…",
      percent: 92,
      detail: "Rebuilding the PDF with the original physical page sizes.",
    };
  }
  return {
    label: "Comparing output sizes…",
    percent: 100,
    detail: "The original will be kept if the flattened copy is not smaller.",
  };
}

function SizeCard({
  label,
  bytes,
  emphasised = false,
}: {
  label: string;
  bytes: number;
  emphasised?: boolean;
}) {
  return (
    <div
      className={
        emphasised
          ? "min-w-32 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-center"
          : "min-w-32 rounded-lg border bg-muted/30 px-4 py-3 text-center"
      }
    >
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tabular-nums">
        {formatBytes(bytes)}
      </p>
    </div>
  );
}

export default function CompressPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<CompressionMode>("lossless");
  const [preset, setPreset] = useState<StrongCompressionPreset>("balanced");
  const [progress, setProgress] = useState<ProgressView | null>(null);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const invalidate = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0] ?? null);
    setResult(null);
    setProgress(null);
    setError(null);
  }, []);

  const handleCompress = useCallback(async () => {
    if (!file) return;
    setResult(null);
    setError(null);

    try {
      const sourceBytes = new Uint8Array(await file.arrayBuffer());
      if (mode === "lossless") {
        const compressionResult = await compressPdf(
          sourceBytes,
          ({ stage }) => {
            const details = LOSSLESS_STAGE_DETAILS[stage];
            setProgress({
              ...details,
              detail:
                stage === "loading-engine"
                  ? "The local WebAssembly engine is cached after its first run."
                  : "Text, links, forms, vectors, and page structure stay intact.",
            });
          },
        );
        setResult({
          ...compressionResult,
          mode: "lossless",
          savedPercent: Math.round(
            (compressionResult.savedSize / compressionResult.originalSize) *
              100,
          ),
        });
      } else {
        const controller = new AbortController();
        abortRef.current = controller;
        setProgress({
          label: "Loading the PDF locally…",
          percent: 5,
          detail: "Preparing the browser renderer.",
        });
        const compressionResult = await strongCompressPdf(
          sourceBytes,
          { preset, signal: controller.signal },
          (nextProgress) => setProgress(strongProgressView(nextProgress)),
        );
        setResult({ ...compressionResult, mode: "strong" });
      }
    } catch (compressionError) {
      if (
        !(compressionError instanceof DOMException) ||
        compressionError.name !== "AbortError"
      ) {
        setError(
          compressionError instanceof Error
            ? compressionError.message
            : "Compression failed.",
        );
      }
    } finally {
      abortRef.current = null;
      setProgress(null);
    }
  }, [file, mode, preset]);

  const handleDownload = useCallback(() => {
    if (!file || !result) return;
    const baseName = file.name.replace(/\.pdf$/i, "") || "document";
    downloadPdfBytes(
      result.bytes,
      `${baseName}-${result.mode === "strong" && !result.usedOriginal ? "strongly-" : ""}compressed.pdf`,
    );
  }, [file, result]);

  const handleRemove = useCallback(() => {
    abortRef.current?.abort();
    setFile(null);
    setResult(null);
    setProgress(null);
    setError(null);
  }, []);

  const isCompressing = progress !== null;

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Compress PDF</h1>
      <p className="text-muted-foreground mt-1">
        Choose lossless resource optimisation or stronger image-based
        compression with clear quality trade-offs.
      </p>
      <PrivacyBanner>
        Both modes run entirely in this browser using WebAssembly, PDF.js, and
        Canvas. Your PDF is never uploaded to a server.
      </PrivacyBanner>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          className={`rounded-lg border p-4 text-left transition-colors ${
            mode === "lossless"
              ? "border-primary bg-primary/5"
              : "hover:border-foreground/20"
          }`}
          aria-pressed={mode === "lossless"}
          disabled={isCompressing}
          onClick={() => {
            setMode("lossless");
            invalidate();
          }}
        >
          <span className="text-sm font-medium">Lossless optimise</span>
          <span className="text-muted-foreground mt-1 block text-xs">
            Preserve text, forms, links, vectors, and accessibility.
          </span>
        </button>
        <button
          type="button"
          className={`rounded-lg border p-4 text-left transition-colors ${
            mode === "strong"
              ? "border-primary bg-primary/5"
              : "hover:border-foreground/20"
          }`}
          aria-pressed={mode === "strong"}
          disabled={isCompressing}
          onClick={() => {
            setMode("strong");
            invalidate();
          }}
        >
          <span className="text-sm font-medium">Strong compression</span>
          <span className="text-muted-foreground mt-1 block text-xs">
            Flatten pages to compressed images for much smaller scan-heavy PDFs.
          </span>
        </button>
      </div>

      {mode === "strong" && (
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-start gap-3">
            <RiAlertLine
              className="mt-0.5 size-5 shrink-0 text-amber-500"
              aria-hidden
            />
            <div>
              <p className="text-sm font-medium">
                Strong compression permanently flattens every page
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                The output loses {STRONG_COMPRESSION_LOSSES.join(", ")}. Keep
                the original for editing or archival use.
              </p>
            </div>
          </div>
          <fieldset className="mt-4">
            <legend className="text-sm font-medium">Quality preset</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {Object.entries(STRONG_COMPRESSION_PRESETS).map(
                ([value, settings]) => (
                  <button
                    key={value}
                    type="button"
                    className={`rounded-md border p-3 text-left ${
                      preset === value
                        ? "border-primary bg-background"
                        : "bg-background/40 hover:border-foreground/20"
                    }`}
                    aria-pressed={preset === value}
                    disabled={isCompressing}
                    onClick={() => {
                      setPreset(value as StrongCompressionPreset);
                      invalidate();
                    }}
                  >
                    <span className="block text-sm font-medium">
                      {settings.label}
                    </span>
                    <span className="text-muted-foreground mt-1 block text-xs">
                      {settings.dpi} DPI · {settings.description}
                    </span>
                  </button>
                ),
              )}
            </div>
          </fieldset>
        </div>
      )}

      <div className="mt-6">
        <PdfDropZone
          onFiles={handleFiles}
          compact={!!file}
          label={file ? "Choose a different PDF" : undefined}
        />
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {file && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <RiFileReduceLine className="size-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-muted-foreground text-xs tabular-nums">
                {formatBytes(file.size)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleRemove}
              disabled={isCompressing && mode === "lossless"}
              aria-label={
                isCompressing && mode === "strong"
                  ? "Cancel compression and remove PDF"
                  : "Remove PDF"
              }
            >
              <RiDeleteBin6Line aria-hidden />
            </Button>
          </div>

          {progress && (
            <output className="block overflow-hidden rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center gap-3">
                <RiLoader4Line
                  className="size-5 animate-spin text-primary"
                  aria-hidden
                />
                <p className="text-sm font-medium">{progress.label}</p>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${progress.percent}%` }}
                >
                  <div className="h-full w-full animate-pulse bg-white/25" />
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-muted-foreground text-xs">
                  {progress.detail}
                </p>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {progress.percent}%
                </span>
              </div>
            </output>
          )}

          {result && (
            <div className="rounded-lg border p-5">
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <SizeCard label="Before" bytes={result.originalSize} />
                <RiArrowRightLine
                  className="size-5 rotate-90 text-muted-foreground sm:rotate-0"
                  aria-hidden
                />
                <SizeCard
                  label="After"
                  bytes={result.compressedSize}
                  emphasised={!result.usedOriginal}
                />
              </div>

              <div className="mt-4 flex flex-col items-center gap-2 text-center">
                {result.usedOriginal ? (
                  <Badge variant="secondary">
                    <RiCheckLine data-icon="inline-start" />
                    Original is already smaller
                  </Badge>
                ) : (
                  <Badge>
                    Saved {formatBytes(result.savedSize)} ({result.savedPercent}
                    %)
                  </Badge>
                )}
                <p className="text-muted-foreground max-w-lg text-xs">
                  {result.usedOriginal
                    ? "The generated copy was not smaller, so the original bytes were kept."
                    : result.mode === "strong"
                      ? `Every page was flattened using the ${STRONG_COMPRESSION_PRESETS[result.preset].label.toLowerCase()} preset.`
                      : "The smaller file preserves selectable text, links, vectors, forms, and page structure."}
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            {result && (
              <Button variant="outline" onClick={handleDownload}>
                <RiDownload2Line data-icon="inline-start" />
                Download PDF
              </Button>
            )}
            {isCompressing && mode === "strong" ? (
              <Button
                variant="outline"
                onClick={() => abortRef.current?.abort()}
              >
                Cancel compression
              </Button>
            ) : (
              <Button onClick={handleCompress} disabled={isCompressing}>
                {isCompressing ? (
                  <RiLoader4Line
                    className="animate-spin"
                    data-icon="inline-start"
                  />
                ) : (
                  <RiFileReduceLine data-icon="inline-start" />
                )}
                {isCompressing
                  ? "Compressing…"
                  : result
                    ? "Compress again"
                    : mode === "strong"
                      ? "Strongly compress PDF"
                      : "Losslessly optimise PDF"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
