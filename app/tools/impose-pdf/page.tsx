"use client";

import {
  RiDeleteBin6Line,
  RiDownload2Line,
  RiLoader4Line,
} from "@remixicon/react";
import { useMemo, useState } from "react";

import { PdfDropZone } from "@/components/pdf/pdf-drop-zone";
import { PrivacyBanner } from "@/components/privacy-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePdfDocument } from "@/hooks/use-pdf-document";
import { downloadPdfBytes } from "@/lib/pdf/download";
import { imposePdf, imposedSheetSize } from "@/lib/pdf/impose";
import {
  buildImpositionSheets,
  type ImpositionMode,
  type ImpositionOrientation,
} from "@/lib/pdf/impose-options";

type PaperSize = "A3" | "A4" | "Letter" | "Tabloid";

const MODES: { value: ImpositionMode; label: string; detail: string }[] = [
  { value: "2-up", label: "2-up", detail: "Two sequential pages per sheet" },
  { value: "4-up", label: "4-up", detail: "Four sequential pages per sheet" },
  {
    value: "booklet",
    label: "Booklet",
    detail: "Reorder paired sides for folding and saddle stitching",
  },
];

function boundedNumber(value: string, minimum: number, maximum: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return minimum;
  return Math.min(maximum, Math.max(minimum, Math.round(parsed)));
}

export default function ImposePdfPage() {
  const {
    pdfBytes,
    pageCount,
    thumbnails,
    fileName,
    loading,
    error,
    loadFile,
    reset,
  } = usePdfDocument();
  const [mode, setMode] = useState<ImpositionMode>("2-up");
  const [pageSize, setPageSize] = useState<PaperSize>("A4");
  const [orientation, setOrientation] =
    useState<ImpositionOrientation>("landscape");
  const [margin, setMargin] = useState(18);
  const [gap, setGap] = useState(12);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [saveError, setSaveError] = useState<string | null>(null);

  const sheets = useMemo(
    () => (pageCount > 0 ? buildImpositionSheets(pageCount, mode) : []),
    [mode, pageCount],
  );
  const sheetSize = imposedSheetSize({
    mode,
    pageSize,
    orientation,
    margin,
    gap,
  });

  async function saveImposedPdf() {
    if (!pdfBytes) return;
    setSaving(true);
    setSaveError(null);
    setProgress({ completed: 0, total: sheets.length });
    try {
      const result = await imposePdf(
        pdfBytes,
        { mode, pageSize, orientation, margin, gap },
        (completed, total) => setProgress({ completed, total }),
      );
      const baseName = (fileName ?? "document").replace(/\.pdf$/i, "");
      downloadPdfBytes(
        result,
        `${baseName}-${mode === "booklet" ? "booklet" : mode}.pdf`,
      );
    } catch (caught) {
      setSaveError(
        caught instanceof Error ? caught.message : "Could not impose PDF",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">PDF N-up & Booklet</h1>
      <p className="text-muted-foreground mt-1">
        Place multiple original pages on each sheet or reorder them for booklet
        printing.
      </p>
      <PrivacyBanner>
        Your PDF is rearranged entirely in this browser. Original text and
        vector content stay embedded; nothing is uploaded.
      </PrivacyBanner>

      <div className="mt-8">
        <PdfDropZone
          onFiles={(files) => loadFile(files[0])}
          compact={Boolean(pdfBytes)}
          label={pdfBytes ? "Choose a different PDF" : "Choose a PDF to impose"}
          sublabel="PDF file - up to 200 MB"
        />
      </div>

      {loading && (
        <div className="text-muted-foreground mt-6 flex items-center justify-center gap-2 text-sm">
          <RiLoader4Line className="size-5 animate-spin" /> Loading and
          rendering pages...
        </div>
      )}
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {pdfBytes && thumbnails.length > 0 && (
        <div className="mt-8 space-y-8">
          <section>
            <h2 className="font-semibold">Layout mode</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {MODES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={mode === item.value}
                  onClick={() => setMode(item.value)}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    mode === item.value
                      ? "border-primary bg-primary/5"
                      : "hover:border-muted-foreground/50"
                  }`}
                >
                  <span className="font-medium">{item.label}</span>
                  <span className="text-muted-foreground mt-1 block text-xs">
                    {item.detail}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-5 rounded-xl border bg-muted/20 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="paper-size">Paper size</Label>
              <select
                id="paper-size"
                value={pageSize}
                onChange={(event) =>
                  setPageSize(event.target.value as PaperSize)
                }
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              >
                <option value="A3">A3</option>
                <option value="A4">A4</option>
                <option value="Letter">US Letter</option>
                <option value="Tabloid">Tabloid</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sheet-orientation">Orientation</Label>
              <select
                id="sheet-orientation"
                value={mode === "booklet" ? "landscape" : orientation}
                disabled={mode === "booklet"}
                onChange={(event) =>
                  setOrientation(event.target.value as ImpositionOrientation)
                }
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm disabled:opacity-60"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sheet-margin">Outer margin (pt)</Label>
              <Input
                id="sheet-margin"
                type="number"
                min={0}
                max={144}
                value={margin}
                onChange={(event) =>
                  setMargin(boundedNumber(event.target.value, 0, 144))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="page-gap">Page gap (pt)</Label>
              <Input
                id="page-gap"
                type="number"
                min={0}
                max={144}
                value={gap}
                onChange={(event) =>
                  setGap(boundedNumber(event.target.value, 0, 144))
                }
              />
            </div>
          </section>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Sheet plan</h2>
                <p className="text-muted-foreground text-sm">
                  {pageCount} source pages become {sheets.length} printed sides
                  at {Math.round(sheetSize.width)} x{" "}
                  {Math.round(sheetSize.height)} pt.
                </p>
              </div>
              <Badge variant="secondary">
                {mode === "booklet"
                  ? "Print double-sided, flip on short edge"
                  : mode}
              </Badge>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sheets.map((sheet, sheetIndex) => (
                <div key={sheetIndex} className="rounded-lg border bg-card p-3">
                  <p className="text-muted-foreground text-xs">
                    {mode === "booklet"
                      ? `Sheet ${Math.floor(sheetIndex / 2) + 1} - ${sheetIndex % 2 === 0 ? "front" : "back"}`
                      : `Side ${sheetIndex + 1}`}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {sheet.slots.map((pageIndex, slotIndex) => (
                      <div
                        key={slotIndex}
                        className="flex min-h-16 items-center justify-center rounded border bg-muted text-sm font-medium"
                      >
                        {pageIndex === null ? "Blank" : `Page ${pageIndex + 1}`}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3 border-t pt-5">
            <Button type="button" variant="outline" onClick={reset}>
              <RiDeleteBin6Line /> Remove PDF
            </Button>
            <Button
              type="button"
              className="ml-auto"
              onClick={saveImposedPdf}
              disabled={saving}
            >
              {saving ? (
                <RiLoader4Line className="animate-spin" />
              ) : (
                <RiDownload2Line />
              )}
              {saving
                ? `Building ${progress.completed}/${progress.total}`
                : mode === "booklet"
                  ? "Build & download booklet"
                  : `Build & download ${mode}`}
            </Button>
          </div>
          {saveError && (
            <p role="alert" className="text-sm text-destructive">
              {saveError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
