"use client";

import {
  RiCloseLine,
  RiCrop2Line,
  RiDownload2Line,
  RiLoader4Line,
} from "@remixicon/react";
import { useCallback, useMemo, useState } from "react";

import { PdfDropZone } from "@/components/pdf/pdf-drop-zone";
import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePdfDocument } from "@/hooks/use-pdf-document";
import { cropPdf } from "@/lib/pdf/crop";
import { calculateCropBox, cropPreviewInsets } from "@/lib/pdf/crop-options";
import type { CropMargins } from "@/lib/pdf/crop-options";
import { downloadPdfBytes } from "@/lib/pdf/download";
import { parsePageRanges } from "@/lib/pdf/page-ranges";

const INITIAL_MARGINS: CropMargins = {
  top: 36,
  right: 36,
  bottom: 36,
  left: 36,
};

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function CropPdfPage() {
  const {
    pdfDoc,
    pdfBytes,
    pageCount,
    thumbnails,
    fileName,
    loading,
    error: loadError,
    loadFile,
    reset,
  } = usePdfDocument();
  const [margins, setMargins] = useState<CropMargins>(INITIAL_MARGINS);
  const [rangeInput, setRangeInput] = useState("");
  const [working, setWorking] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const range = useMemo(
    () => parsePageRanges(rangeInput, pageCount),
    [pageCount, rangeInput],
  );
  const previewBox = pdfDoc?.getPage(0).getCropBox() ?? {
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  };
  const geometryError = useMemo(() => {
    if (!pdfDoc) return null;
    try {
      for (const index of range.pages.length
        ? range.pages
        : Array.from({ length: pageCount }, (_, i) => i)) {
        calculateCropBox(pdfDoc.getPage(index).getCropBox(), margins);
      }
      return null;
    } catch (failure) {
      return failure instanceof Error
        ? failure.message
        : "Invalid crop margins.";
    }
  }, [margins, pageCount, pdfDoc, range.pages]);
  const targetCount = range.pages.length || pageCount;
  const insets = cropPreviewInsets(previewBox, margins);
  const invalidate = useCallback(() => {
    setResult(null);
    setSaveError(null);
  }, []);

  const updateMargin = (side: keyof CropMargins, value: number) => {
    setMargins((current) => ({ ...current, [side]: Math.max(0, value) }));
    invalidate();
  };

  const handleCrop = useCallback(async () => {
    if (!pdfBytes || range.error || geometryError) return;
    setWorking(true);
    setCompleted(0);
    invalidate();
    try {
      setResult(
        await cropPdf(pdfBytes, margins, range.pages, (done) =>
          setCompleted(done),
        ),
      );
    } catch (failure) {
      setSaveError(
        failure instanceof Error ? failure.message : "Could not crop this PDF.",
      );
    } finally {
      setWorking(false);
    }
  }, [geometryError, invalidate, margins, pdfBytes, range]);

  const outputName = `${(fileName ?? "document").replace(/\.pdf$/i, "")}-cropped.pdf`;
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Crop PDF</h1>
      <p className="text-muted-foreground mt-1">
        Adjust the visible area of all pages or a selected range.
      </p>
      <PrivacyBanner>
        Your PDF is cropped locally in your browser. Nothing is uploaded or sent
        to a server.
      </PrivacyBanner>
      <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-muted-foreground">
        <strong className="text-foreground">Cropping is reversible.</strong>{" "}
        Hidden content remains in the PDF and may be recoverable. Do not use
        cropping to remove sensitive information.
      </div>
      <div className="mt-8">
        <PdfDropZone
          compact={!!pdfBytes}
          label={pdfBytes ? "Choose a different PDF" : undefined}
          onFiles={(files) => {
            invalidate();
            setRangeInput("");
            void loadFile(files[0]);
          }}
        />
      </div>
      {loading && (
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <RiLoader4Line className="size-5 animate-spin" />
          Loading and previewing PDF…
        </div>
      )}
      {loadError && (
        <p className="mt-4 text-sm text-destructive">{loadError}</p>
      )}
      {pdfBytes && thumbnails.length > 0 && (
        <div className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.2fr)]">
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="mb-3 text-sm font-medium">First-page preview</p>
              <div className="mx-auto w-fit max-w-full overflow-hidden bg-white shadow-sm">
                <div className="relative">
                  <img
                    src={thumbnails[0]}
                    alt="First PDF page crop preview"
                    className="max-h-[420px] max-w-full object-contain"
                  />
                  <div
                    className="pointer-events-none absolute border-2 border-primary bg-primary/5 shadow-[0_0_0_9999px_rgba(0,0,0,0.48)]"
                    style={insets}
                  />
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Blue outline is the retained visible area.
              </p>
            </div>
            <div className="grid content-start gap-4 rounded-lg border p-4 sm:grid-cols-2">
              {(["top", "right", "bottom", "left"] as const).map((side) => (
                <div key={side}>
                  <Label htmlFor={`crop-${side}`}>
                    {side[0].toUpperCase() + side.slice(1)} margin (pt)
                  </Label>
                  <Input
                    id={`crop-${side}`}
                    type="number"
                    min="0"
                    step="1"
                    value={margins[side]}
                    onChange={(e) => updateMargin(side, Number(e.target.value))}
                    className="mt-1.5"
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <Label htmlFor="crop-pages">Pages</Label>
                <Input
                  id="crop-pages"
                  value={rangeInput}
                  onChange={(e) => {
                    setRangeInput(e.target.value);
                    invalidate();
                  }}
                  placeholder={`All pages, or 1-3, ${pageCount}`}
                  className="mt-1.5"
                />
                {range.error && (
                  <p className="mt-1 text-xs text-destructive">{range.error}</p>
                )}
              </div>
              {geometryError && (
                <p className="sm:col-span-2 text-sm text-destructive">
                  {geometryError}
                </p>
              )}
            </div>
          </div>
          {working && (
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <RiLoader4Line className="size-4 animate-spin" />
                Cropping page {Math.min(completed + 1, targetCount)} of{" "}
                {targetCount}…
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{
                    width: `${targetCount ? (completed / targetCount) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          )}
          {saveError && <p className="text-sm text-destructive">{saveError}</p>}
          {result && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div>
                <p className="font-medium">Your cropped PDF is ready</p>
                <p className="text-sm text-muted-foreground">
                  {targetCount} cropped page{targetCount === 1 ? "" : "s"} ·{" "}
                  {formatBytes(result.byteLength)}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => downloadPdfBytes(result, outputName)}
              >
                <RiDownload2Line data-icon="inline-start" />
                Download PDF
              </Button>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={working}
              onClick={() => {
                reset();
                setRangeInput("");
                setMargins(INITIAL_MARGINS);
                invalidate();
              }}
            >
              <RiCloseLine data-icon="inline-start" />
              Remove PDF
            </Button>
            <Button
              disabled={working || !!range.error || !!geometryError}
              onClick={() => void handleCrop()}
            >
              {working ? (
                <RiLoader4Line
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <RiCrop2Line data-icon="inline-start" />
              )}
              {working ? "Cropping…" : "Crop PDF"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
