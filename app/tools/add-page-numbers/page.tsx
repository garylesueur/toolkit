"use client";

import {
  RiCloseLine,
  RiDownload2Line,
  RiFileList3Line,
  RiLoader4Line,
} from "@remixicon/react";
import { useCallback, useMemo, useState } from "react";

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
import { downloadPdfBytes } from "@/lib/pdf/download";
import type {
  PageNumberFormat,
  PageNumberPosition,
} from "@/lib/pdf/page-number-options";
import { addPageNumbers } from "@/lib/pdf/page-numbers";
import { parsePageRanges } from "@/lib/pdf/page-ranges";

const POSITIONS: Array<{ label: string; value: PageNumberPosition }> = [
  { label: "Bottom centre", value: "bottom-center" },
  { label: "Bottom left", value: "bottom-left" },
  { label: "Bottom right", value: "bottom-right" },
  { label: "Top centre", value: "top-center" },
  { label: "Top left", value: "top-left" },
  { label: "Top right", value: "top-right" },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AddPageNumbersPage() {
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
  const [format, setFormat] = useState<PageNumberFormat>("number");
  const [position, setPosition] = useState<PageNumberPosition>("bottom-center");
  const [colour, setColour] = useState<"dark" | "light">("dark");
  const [fontSize, setFontSize] = useState(12);
  const [margin, setMargin] = useState(28);
  const [startNumber, setStartNumber] = useState(1);
  const [rangeInput, setRangeInput] = useState("");
  const [working, setWorking] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const range = useMemo(
    () => parsePageRanges(rangeInput, pageCount),
    [pageCount, rangeInput],
  );
  const targetCount = range.pages.length || pageCount;

  const invalidate = useCallback(() => {
    setResult(null);
    setSaveError(null);
  }, []);

  const handleAdd = useCallback(async () => {
    if (!pdfBytes || range.error) return;
    setWorking(true);
    setCompleted(0);
    setResult(null);
    setSaveError(null);
    try {
      const bytes = await addPageNumbers(
        pdfBytes,
        {
          colour,
          fontSize,
          format,
          margin,
          pages: range.pages,
          position,
          startNumber,
        },
        (done) => setCompleted(done),
      );
      setResult(bytes);
    } catch (failure) {
      setSaveError(
        failure instanceof Error
          ? failure.message
          : "Could not add page numbers.",
      );
    } finally {
      setWorking(false);
    }
  }, [
    colour,
    fontSize,
    format,
    margin,
    pdfBytes,
    position,
    range,
    startNumber,
  ]);

  const outputName = `${(fileName ?? "document").replace(/\.pdf$/i, "")}-numbered.pdf`;

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Add Page Numbers</h1>
      <p className="text-muted-foreground mt-1">
        Number every page or a selected range with flexible formatting.
      </p>
      <PrivacyBanner>
        Your PDF is numbered entirely in your browser. Nothing is uploaded or
        sent to a server.
      </PrivacyBanner>

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
          <RiLoader4Line className="size-5 animate-spin" aria-hidden />
          Loading and previewing PDF…
        </div>
      )}
      {loadError && (
        <p className="mt-4 text-sm text-destructive">{loadError}</p>
      )}

      {pdfBytes && thumbnails.length > 0 && (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>Format</Label>
              <Select
                value={format}
                onValueChange={(value) => {
                  setFormat(value as PageNumberFormat);
                  invalidate();
                }}
              >
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="number">1</SelectItem>
                  <SelectItem value="page">Page 1</SelectItem>
                  <SelectItem value="fraction">1 / 10</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Position</Label>
              <Select
                value={position}
                onValueChange={(value) => {
                  setPosition(value as PageNumberPosition);
                  invalidate();
                }}
              >
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Text colour</Label>
              <Select
                value={colour}
                onValueChange={(value) => {
                  setColour(value as "dark" | "light");
                  invalidate();
                }}
              >
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="light">White</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="page-number-start">Start number</Label>
              <Input
                id="page-number-start"
                type="number"
                min="0"
                max="999999"
                value={startNumber}
                onChange={(event) => {
                  setStartNumber(Math.max(0, Number(event.target.value)));
                  invalidate();
                }}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="page-number-size">Font size</Label>
              <Input
                id="page-number-size"
                type="number"
                min="6"
                max="72"
                value={fontSize}
                onChange={(event) => {
                  setFontSize(
                    Math.min(72, Math.max(6, Number(event.target.value))),
                  );
                  invalidate();
                }}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="page-number-margin">Margin (points)</Label>
              <Input
                id="page-number-margin"
                type="number"
                min="0"
                max="200"
                value={margin}
                onChange={(event) => {
                  setMargin(
                    Math.min(200, Math.max(0, Number(event.target.value))),
                  );
                  invalidate();
                }}
                className="mt-1.5"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Label htmlFor="page-number-pages">Pages</Label>
              <Input
                id="page-number-pages"
                value={rangeInput}
                onChange={(event) => {
                  setRangeInput(event.target.value);
                  invalidate();
                }}
                placeholder={`All pages, or 1-3, ${pageCount}`}
                className="mt-1.5"
              />
              {range.error && (
                <p className="mt-1 text-xs text-destructive">{range.error}</p>
              )}
            </div>
          </div>

          <PageThumbnailGrid thumbnails={thumbnails} />

          {working && (
            <div
              className="rounded-lg border bg-muted/20 p-4"
              aria-live="polite"
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <RiLoader4Line className="size-4 animate-spin" aria-hidden />
                Numbering page {Math.min(completed + 1, targetCount)} of{" "}
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
                <p className="font-medium">Your numbered PDF is ready</p>
                <p className="text-sm text-muted-foreground">
                  {targetCount} numbered page{targetCount === 1 ? "" : "s"} ·{" "}
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
                invalidate();
              }}
            >
              <RiCloseLine data-icon="inline-start" />
              Remove PDF
            </Button>
            <Button
              disabled={working || !!range.error}
              onClick={() => void handleAdd()}
            >
              {working ? (
                <RiLoader4Line
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <RiFileList3Line data-icon="inline-start" />
              )}
              {working ? "Adding numbers…" : "Add page numbers"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
