"use client";

import {
  RiDownload2Line,
  RiGitMergeLine,
  RiLoader4Line,
} from "@remixicon/react";
import { useCallback, useMemo, useState } from "react";

import { PdfDropZone } from "@/components/pdf/pdf-drop-zone";
import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { usePdfDocument } from "@/hooks/use-pdf-document";
import { comparePdfDocuments } from "@/lib/pdf/compare";
import type { PdfPageComparison } from "@/lib/pdf/compare";
import { comparisonSummary } from "@/lib/pdf/compare-options";

function downloadReport(
  pages: PdfPageComparison[],
  leftName: string,
  rightName: string,
  threshold: number,
) {
  const report = {
    files: { comparison: rightName, original: leftName },
    generatedAt: new Date().toISOString(),
    note: "Visual pixel comparison rendered locally in the browser. This is not a semantic, structural, or cryptographic comparison.",
    pages: pages.map(
      ({
        changedPixels,
        meanDelta,
        pageNumber,
        percentChanged,
        totalPixels,
      }) => ({
        changedPixels,
        meanDelta: Number(meanDelta.toFixed(3)),
        pageNumber,
        percentChanged: Number(percentChanged.toFixed(4)),
        totalPixels,
      }),
    ),
    summary: comparisonSummary(pages),
    threshold,
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "pdf-comparison-report.json";
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export default function ComparePdfsPage() {
  const left = usePdfDocument();
  const right = usePdfDocument();
  const [threshold, setThreshold] = useState(24);
  const [working, setWorking] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState<PdfPageComparison[]>([]);
  const [selectedPage, setSelectedPage] = useState(0);
  const [mode, setMode] = useState<"overlay" | "difference">("overlay");
  const [slider, setSlider] = useState(50);
  const [error, setError] = useState<string | null>(null);
  const summary = useMemo(() => comparisonSummary(pages), [pages]);
  const selected = pages[selectedPage];

  const invalidate = useCallback(() => {
    setPages([]);
    setSelectedPage(0);
    setError(null);
  }, []);

  const handleCompare = useCallback(async () => {
    if (!left.pdfBytes || !right.pdfBytes) return;
    setWorking(true);
    setCompleted(0);
    setTotal(Math.max(left.pageCount, right.pageCount));
    invalidate();
    try {
      setPages(
        await comparePdfDocuments(
          left.pdfBytes,
          right.pdfBytes,
          threshold,
          0.8,
          (done, count) => {
            setCompleted(done);
            setTotal(count);
          },
        ),
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not compare these PDFs.",
      );
    } finally {
      setWorking(false);
    }
  }, [
    invalidate,
    left.pageCount,
    left.pdfBytes,
    right.pageCount,
    right.pdfBytes,
    threshold,
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Compare PDFs</h1>
      <p className="mt-1 text-muted-foreground">
        Find visual differences between matching pages in two PDF files.
      </p>
      <PrivacyBanner>
        Both PDFs are rendered and compared entirely in your browser. Nothing is
        uploaded or sent to a server.
      </PrivacyBanner>
      <div className="mt-4 rounded-lg border p-4 text-sm text-muted-foreground">
        This is a visual pixel comparison, not a semantic or cryptographic one.
        Small font-rendering differences may appear; the tolerance control helps
        ignore minor anti-aliasing changes.
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <p className="mb-3 font-medium">1. Original PDF</p>
          <PdfDropZone
            compact={!!left.pdfBytes}
            label={
              left.pdfBytes
                ? (left.fileName ?? "Choose original PDF")
                : "Choose original PDF"
            }
            onFiles={(files) => {
              invalidate();
              void left.loadFile(files[0]);
            }}
          />
          {left.loading && (
            <p className="mt-3 text-sm text-muted-foreground">
              Loading original…
            </p>
          )}
          {left.error && (
            <p className="mt-3 text-sm text-destructive">{left.error}</p>
          )}
          {left.pdfBytes && !left.loading && (
            <p className="mt-3 text-sm text-muted-foreground">
              {left.pageCount} {left.pageCount === 1 ? "page" : "pages"}
            </p>
          )}
        </div>
        <div className="rounded-lg border p-4">
          <p className="mb-3 font-medium">2. Comparison PDF</p>
          <PdfDropZone
            compact={!!right.pdfBytes}
            label={
              right.pdfBytes
                ? (right.fileName ?? "Choose comparison PDF")
                : "Choose comparison PDF"
            }
            onFiles={(files) => {
              invalidate();
              void right.loadFile(files[0]);
            }}
          />
          {right.loading && (
            <p className="mt-3 text-sm text-muted-foreground">
              Loading comparison…
            </p>
          )}
          {right.error && (
            <p className="mt-3 text-sm text-destructive">{right.error}</p>
          )}
          {right.pdfBytes && !right.loading && (
            <p className="mt-3 text-sm text-muted-foreground">
              {right.pageCount} {right.pageCount === 1 ? "page" : "pages"}
            </p>
          )}
        </div>
      </div>

      {left.pdfBytes && right.pdfBytes && !left.loading && !right.loading && (
        <div className="mt-6 space-y-4 rounded-lg border p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-56 flex-1">
              <Label htmlFor="comparison-threshold">
                Pixel tolerance ({threshold})
              </Label>
              <input
                id="comparison-threshold"
                type="range"
                min={0}
                max={64}
                value={threshold}
                onChange={(event) => {
                  setThreshold(Number(event.target.value));
                  invalidate();
                }}
                className="mt-2 w-full accent-primary"
              />
            </div>
            <Button disabled={working} onClick={handleCompare}>
              {working ? (
                <RiLoader4Line className="size-4 animate-spin" />
              ) : (
                <RiGitMergeLine className="size-4" />
              )}
              {working ? `Comparing ${completed}/${total}…` : "Compare PDFs"}
            </Button>
          </div>
          {working && (
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${total ? (completed / total) * 100 : 3}%` }}
              />
            </div>
          )}
        </div>
      )}
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {pages.length > 0 && selected && (
        <div className="mt-6 space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-2xl font-semibold">{summary.totalPages}</p>
              <p className="text-sm text-muted-foreground">Pages compared</p>
            </div>
            <div className="rounded-lg border border-pink-500/30 bg-pink-500/5 p-4">
              <p className="text-2xl font-semibold">{summary.changedPages}</p>
              <p className="text-sm text-muted-foreground">Pages changed</p>
            </div>
            <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
              <p className="text-2xl font-semibold">{summary.identicalPages}</p>
              <p className="text-sm text-muted-foreground">
                Visually identical
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={mode === "overlay" ? "default" : "outline"}
                onClick={() => setMode("overlay")}
              >
                Overlay slider
              </Button>
              <Button
                size="sm"
                variant={mode === "difference" ? "default" : "outline"}
                onClick={() => setMode("difference")}
              >
                Difference map
              </Button>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                downloadReport(
                  pages,
                  left.fileName ?? "original.pdf",
                  right.fileName ?? "comparison.pdf",
                  threshold,
                )
              }
            >
              <RiDownload2Line className="size-4" />
              Download report
            </Button>
          </div>

          <div className="rounded-lg border p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">Page {selected.pageNumber}</p>
              <p className="text-sm text-muted-foreground">
                {selected.percentChanged.toFixed(2)}% of pixels changed
              </p>
            </div>
            {mode === "overlay" ? (
              <div>
                <div
                  className="relative mx-auto max-w-3xl overflow-hidden rounded border bg-white"
                  style={{
                    aspectRatio: `${selected.width} / ${selected.height}`,
                  }}
                >
                  <img
                    src={selected.leftUrl}
                    alt={`Original page ${selected.pageNumber}`}
                    className="absolute inset-0 size-full object-contain"
                  />
                  <img
                    src={selected.rightUrl}
                    alt={`Comparison page ${selected.pageNumber}`}
                    className="absolute inset-0 size-full object-contain"
                    style={{ clipPath: `inset(0 ${100 - slider}% 0 0)` }}
                  />
                  <div
                    className="absolute inset-y-0 w-0.5 bg-primary shadow"
                    style={{ left: `${slider}%` }}
                  />
                </div>
                <Label htmlFor="overlay-position" className="sr-only">
                  Overlay position
                </Label>
                <input
                  id="overlay-position"
                  type="range"
                  min={0}
                  max={100}
                  value={slider}
                  onChange={(event) => setSlider(Number(event.target.value))}
                  className="mx-auto mt-3 block w-full max-w-3xl accent-primary"
                />
                <div className="mx-auto flex max-w-3xl justify-between text-xs text-muted-foreground">
                  <span>Original</span>
                  <span>Comparison</span>
                </div>
              </div>
            ) : (
              <img
                src={selected.diffUrl}
                alt={`Difference map for page ${selected.pageNumber}`}
                className="mx-auto max-h-[70vh] max-w-full rounded border bg-white object-contain"
              />
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-8">
            {pages.map((page, index) => (
              <Button
                key={page.pageNumber}
                size="sm"
                variant={selectedPage === index ? "default" : "outline"}
                onClick={() => setSelectedPage(index)}
                className="h-auto flex-col py-2"
              >
                <span>Page {page.pageNumber}</span>
                <span className="text-xs opacity-75">
                  {page.percentChanged.toFixed(1)}%
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
