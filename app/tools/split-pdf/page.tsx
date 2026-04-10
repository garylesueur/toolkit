"use client";

import {
  RiDownload2Line,
  RiLoader4Line,
  RiDeleteBin6Line,
} from "@remixicon/react";
import { downloadZip } from "client-zip";
import { useState, useCallback } from "react";

import { PageThumbnailGrid } from "@/components/pdf/page-thumbnail-grid";
import { PdfDropZone } from "@/components/pdf/pdf-drop-zone";
import { parsePageRanges } from "@/components/pdf/pdf-page-range-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePdfDocument } from "@/hooks/use-pdf-document";
import { downloadPdfBytes } from "@/lib/pdf/download";
import { splitPdfByPages, splitPdfByRanges } from "@/lib/pdf/split";

type SplitMode = "all" | "ranges";

export default function SplitPdfPage() {
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
  const [mode, setMode] = useState<SplitMode>("all");
  const [rangeInput, setRangeInput] = useState("");
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const baseName = (fileName ?? "document").replace(/\.pdf$/i, "");

  const handleSplit = useCallback(async () => {
    if (!pdfBytes) return;
    setSaving(true);
    try {
      let results: { name: string; bytes: Uint8Array }[];

      if (mode === "all") {
        results = await splitPdfByPages(pdfBytes, baseName);
      } else {
        // Parse comma-separated ranges into groups
        const parts = rangeInput
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean);
        if (parts.length === 0) {
          setRangeError(
            "Enter at least one range (separate groups with semicolons).",
          );
          setSaving(false);
          return;
        }

        const ranges: number[][] = [];
        for (const part of parts) {
          const result = parsePageRanges(part, pageCount);
          if (result.error) {
            setRangeError(result.error);
            setSaving(false);
            return;
          }
          ranges.push(result.pages);
        }

        results = await splitPdfByRanges(pdfBytes, ranges, baseName);
      }

      if (results.length === 1) {
        downloadPdfBytes(results[0].bytes, results[0].name);
      } else {
        // Download as ZIP
        const files = results.map((r) => ({
          name: r.name,
          input: r.bytes,
        }));
        const blob = await downloadZip(files).blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${baseName}-split.zip`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setRangeError(err instanceof Error ? err.message : "Split failed.");
    } finally {
      setSaving(false);
    }
  }, [pdfBytes, mode, rangeInput, pageCount, baseName]);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Split PDF</h1>
      <p className="text-muted-foreground mt-1">
        Split a PDF into individual pages or custom ranges. Downloads as a ZIP.
      </p>

      <div className="mt-8">
        <PdfDropZone
          onFiles={(files) => loadFile(files[0])}
          compact={!!pdfBytes}
        />
      </div>

      {loading && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <RiLoader4Line className="text-muted-foreground size-5 animate-spin" />
          <span className="text-muted-foreground text-sm">Loading PDF…</span>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {thumbnails.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-end gap-6">
            <div>
              <Label>Split mode</Label>
              <div className="mt-1.5 flex gap-2">
                <Button
                  variant={mode === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setMode("all");
                    setRangeError(null);
                  }}
                >
                  Every page
                </Button>
                <Button
                  variant={mode === "ranges" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMode("ranges")}
                >
                  By ranges
                </Button>
              </div>
            </div>

            {mode === "ranges" && (
              <div className="min-w-64 flex-1">
                <Label>Ranges (semicolons separate output files)</Label>
                <Input
                  value={rangeInput}
                  onChange={(e) => {
                    setRangeInput(e.target.value);
                    setRangeError(null);
                  }}
                  placeholder="e.g. 1-3; 4-6; 7"
                  className="mt-1.5"
                />
                {rangeError && (
                  <p className="mt-1 text-xs text-destructive">{rangeError}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                reset();
                setRangeInput("");
                setRangeError(null);
              }}
            >
              <RiDeleteBin6Line data-icon="inline-start" />
              Remove PDF
            </Button>

            <div className="ml-auto flex items-center gap-2">
              <Badge>
                {pageCount} page{pageCount !== 1 ? "s" : ""}
              </Badge>
              <Button size="sm" onClick={handleSplit} disabled={saving}>
                {saving ? (
                  <RiLoader4Line className="size-4 animate-spin" />
                ) : (
                  <RiDownload2Line data-icon="inline-start" />
                )}
                Split & Download
              </Button>
            </div>
          </div>

          <PageThumbnailGrid thumbnails={thumbnails} />
        </div>
      )}
    </div>
  );
}
