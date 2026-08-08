"use client";

import {
  RiCloseLine,
  RiDownload2Line,
  RiFileImageLine,
  RiLoader4Line,
} from "@remixicon/react";
import { downloadZip } from "client-zip";
import { useCallback, useMemo, useRef, useState } from "react";

import { PageThumbnailGrid } from "@/components/pdf/page-thumbnail-grid";
import { PdfDropZone } from "@/components/pdf/pdf-drop-zone";
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
import { usePdfDocument } from "@/hooks/use-pdf-document";
import { parsePageRanges } from "@/lib/pdf/page-ranges";
import { pdfToImages } from "@/lib/pdf/to-images";
import type { PdfImageResult } from "@/lib/pdf/to-images";
import { PDF_IMAGE_SCALES, pdfBaseName } from "@/lib/pdf/to-images-options";
import type {
  PdfImageFormat,
  PdfImageScale,
} from "@/lib/pdf/to-images-options";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function PdfToImagesPage() {
  const {
    pdfBytes,
    pageCount,
    thumbnails,
    fileName,
    loading,
    error: loadError,
    loadFile,
    reset,
  } = usePdfDocument();
  const [format, setFormat] = useState<PdfImageFormat>("png");
  const [scale, setScale] = useState<PdfImageScale>(2);
  const [jpegQuality, setJpegQuality] = useState(0.85);
  const [rangeInput, setRangeInput] = useState("");
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [exportTotal, setExportTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [results, setResults] = useState<PdfImageResult[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const parsedRange = useMemo(
    () => parsePageRanges(rangeInput, pageCount),
    [pageCount, rangeInput],
  );
  const totalSize = results.reduce((sum, result) => sum + result.blob.size, 0);

  const invalidateResults = useCallback(() => {
    setResults([]);
    setExportError(null);
  }, []);

  const handleExport = useCallback(async () => {
    if (!pdfBytes || !fileName || parsedRange.error) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setExporting(true);
    setResults([]);
    setExportError(null);
    setCompleted(0);
    setCurrentPage(0);
    const expectedTotal =
      parsedRange.pages.length === 0 ? pageCount : parsedRange.pages.length;
    setExportTotal(expectedTotal);

    try {
      const images = await pdfToImages(
        pdfBytes,
        {
          fileName,
          format,
          jpegQuality,
          pages: parsedRange.pages,
          scale,
          signal: controller.signal,
        },
        (nextCompleted, _total, pageNumber) => {
          setCompleted(nextCompleted);
          setCurrentPage(pageNumber);
        },
      );
      setResults(images);
    } catch (exportFailure) {
      if (
        exportFailure instanceof DOMException &&
        exportFailure.name === "AbortError"
      ) {
        setExportError("Export cancelled.");
      } else {
        setExportError(
          exportFailure instanceof Error
            ? exportFailure.message
            : "Could not export this PDF.",
        );
      }
    } finally {
      abortRef.current = null;
      setExporting(false);
    }
  }, [fileName, format, jpegQuality, pageCount, parsedRange, pdfBytes, scale]);

  const handleDownload = useCallback(async () => {
    if (results.length === 0) return;
    if (results.length === 1) {
      downloadBlob(results[0].blob, results[0].name);
      return;
    }

    const zip = await downloadZip(
      results.map((result) => ({ name: result.name, input: result.blob })),
    ).blob();
    downloadBlob(zip, `${pdfBaseName(fileName ?? "document")}-images.zip`);
  }, [fileName, results]);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">PDF to Images</h1>
      <p className="text-muted-foreground mt-1">
        Export PDF pages as high-quality PNG or JPEG images.
      </p>
      <PrivacyBanner>
        Your PDF is rendered locally with PDF.js. It is never uploaded or sent
        to a server.
      </PrivacyBanner>

      <div className="mt-8">
        <PdfDropZone
          onFiles={(files) => {
            invalidateResults();
            setRangeInput("");
            setRangeError(null);
            void loadFile(files[0]);
          }}
          compact={!!pdfBytes}
          label={pdfBytes ? "Choose a different PDF" : undefined}
        />
      </div>

      {loading && (
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <RiLoader4Line className="size-5 animate-spin" aria-hidden />
          Loading and previewing PDF…
        </div>
      )}

      {loadError && (
        <p className="mt-4 text-sm text-destructive">{loadError}</p>
      )}

      {pdfBytes && thumbnails.length > 0 && (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label>Image format</Label>
              <Select
                value={format}
                onValueChange={(value) => {
                  setFormat(value as PdfImageFormat);
                  invalidateResults();
                }}
              >
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="png">PNG — lossless</SelectItem>
                  <SelectItem value="jpeg">JPEG — smaller</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Resolution</Label>
              <Select
                value={String(scale)}
                onValueChange={(value) => {
                  setScale(Number(value) as PdfImageScale);
                  invalidateResults();
                }}
              >
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PDF_IMAGE_SCALES.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value}× · {Math.round(value * 72)} DPI
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="pdf-image-pages">Pages</Label>
              <Input
                id="pdf-image-pages"
                value={rangeInput}
                onChange={(event) => {
                  const value = event.target.value;
                  setRangeInput(value);
                  const parsed = parsePageRanges(value, pageCount);
                  setRangeError(parsed.error);
                  invalidateResults();
                }}
                placeholder={`All, or 1-3, ${pageCount}`}
                className="mt-1.5"
              />
              {rangeError && (
                <p className="mt-1 text-xs text-destructive">{rangeError}</p>
              )}
            </div>

            <div className={format === "jpeg" ? "" : "opacity-50"}>
              <Label htmlFor="pdf-image-quality">
                JPEG quality · {Math.round(jpegQuality * 100)}%
              </Label>
              <input
                id="pdf-image-quality"
                type="range"
                min="0.45"
                max="1"
                step="0.05"
                value={jpegQuality}
                disabled={format !== "jpeg"}
                onChange={(event) => {
                  setJpegQuality(Number(event.target.value));
                  invalidateResults();
                }}
                className="mt-3 w-full accent-primary"
              />
            </div>
          </div>

          <PageThumbnailGrid thumbnails={thumbnails} />

          {exporting && (
            <div
              className="rounded-lg border bg-muted/20 p-4"
              aria-live="polite"
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <RiLoader4Line className="size-4 animate-spin" aria-hidden />
                {completed === 0
                  ? "Preparing the renderer…"
                  : `Rendered PDF page ${currentPage} · ${completed} of ${exportTotal}`}
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{
                    width: `${exportTotal === 0 ? 0 : (completed / exportTotal) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {exportError && (
            <p className="text-sm text-destructive">{exportError}</p>
          )}

          {results.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div>
                <p className="font-medium">Your images are ready</p>
                <p className="text-sm text-muted-foreground">
                  {results.length} image{results.length === 1 ? "" : "s"} ·{" "}
                  {formatBytes(totalSize)} · {results[0].width}×
                  {results[0].height}px
                </p>
              </div>
              <Button variant="outline" onClick={() => void handleDownload()}>
                <RiDownload2Line data-icon="inline-start" />
                {results.length === 1 ? "Download image" : "Download ZIP"}
              </Button>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (exporting) abortRef.current?.abort();
                else {
                  reset();
                  setRangeInput("");
                  setRangeError(null);
                  invalidateResults();
                }
              }}
            >
              <RiCloseLine data-icon="inline-start" />
              {exporting ? "Cancel export" : "Remove PDF"}
            </Button>
            <Button
              onClick={() => void handleExport()}
              disabled={exporting || !!rangeError}
            >
              {exporting ? (
                <RiLoader4Line
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <RiFileImageLine data-icon="inline-start" />
              )}
              {exporting ? "Exporting…" : "Export pages"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
