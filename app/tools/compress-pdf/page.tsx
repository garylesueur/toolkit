"use client";

import {
  RiArrowRightLine,
  RiCheckLine,
  RiDownload2Line,
  RiFileReduceLine,
  RiLoader4Line,
  RiDeleteBin6Line,
} from "@remixicon/react";
import { useState, useCallback } from "react";

import { PdfDropZone } from "@/components/pdf/pdf-drop-zone";
import { PrivacyBanner } from "@/components/privacy-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { compressPdf } from "@/lib/pdf/compress";
import type { CompressResult, CompressStage } from "@/lib/pdf/compress";
import { downloadPdfBytes } from "@/lib/pdf/download";

const STAGE_DETAILS: Record<
  CompressStage,
  { label: string; progress: string }
> = {
  "loading-engine": {
    label: "Loading the compression engine…",
    progress: "w-1/4",
  },
  "optimising": { label: "Optimising PDF resources…", progress: "w-2/3" },
  "verifying": { label: "Verifying the result…", progress: "w-full" },
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  const [stage, setStage] = useState<CompressStage | null>(null);
  const [result, setResult] = useState<CompressResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0]);
    setResult(null);
    setStage(null);
    setError(null);
  }, []);

  const handleCompress = useCallback(async () => {
    if (!file) return;
    setStage("loading-engine");
    setResult(null);
    setError(null);

    try {
      const sourceBytes = new Uint8Array(await file.arrayBuffer());
      const compressionResult = await compressPdf(sourceBytes, (progress) => {
        setStage(progress.stage);
      });
      setResult(compressionResult);
    } catch (compressionError) {
      setError(
        compressionError instanceof Error
          ? compressionError.message
          : "Compression failed.",
      );
    } finally {
      setStage(null);
    }
  }, [file]);

  const handleDownload = useCallback(() => {
    if (!file || !result) return;
    const baseName = file.name.replace(/\.pdf$/i, "");
    downloadPdfBytes(result.bytes, `${baseName}-compressed.pdf`);
  }, [file, result]);

  const handleRemove = useCallback(() => {
    setFile(null);
    setResult(null);
    setStage(null);
    setError(null);
  }, []);

  const isCompressing = stage !== null;
  const savedPercent = result
    ? Math.round((result.savedSize / result.originalSize) * 100)
    : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Compress PDF</h1>
      <p className="text-muted-foreground mt-1">
        Optimise fonts, content streams, and duplicate resources without
        flattening your PDF or reducing image quality.
      </p>
      <PrivacyBanner>
        Your PDF is compressed locally with WebAssembly. It never leaves your
        browser or gets uploaded to a server.
      </PrivacyBanner>

      <div className="mt-8">
        <PdfDropZone onFiles={handleFiles} compact={!!file} />
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
              disabled={isCompressing}
              aria-label="Remove PDF"
            >
              <RiDeleteBin6Line aria-hidden />
            </Button>
          </div>

          {stage && (
            <div className="overflow-hidden rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center gap-3">
                <RiLoader4Line
                  className="size-5 animate-spin text-primary"
                  aria-hidden
                />
                <p className="text-sm font-medium">
                  {STAGE_DETAILS[stage].label}
                </p>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full bg-primary transition-all duration-700 ease-out ${STAGE_DETAILS[stage].progress}`}
                >
                  <div className="h-full w-full animate-pulse bg-white/25" />
                </div>
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                The first run downloads the local compression engine. Future
                runs use the browser cache.
              </p>
            </div>
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
                    Already efficiently optimised
                  </Badge>
                ) : (
                  <Badge>
                    Saved {formatBytes(result.savedSize)} ({savedPercent}%)
                  </Badge>
                )}
                <p className="text-muted-foreground max-w-lg text-xs">
                  {result.usedOriginal
                    ? "The optimised copy was not smaller, so the original bytes were kept."
                    : "The smaller file preserves selectable text, links, vectors, forms, and page structure."}
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            {result && (
              <Button variant="outline" onClick={handleDownload}>
                <RiDownload2Line data-icon="inline-start" />
                Download PDF
              </Button>
            )}
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
                  : "Compress PDF"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
