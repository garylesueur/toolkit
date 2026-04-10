"use client";

import {
  RiDownload2Line,
  RiLoader4Line,
  RiDeleteBin6Line,
} from "@remixicon/react";
import { useState, useCallback } from "react";

import { PageThumbnailGrid } from "@/components/pdf/page-thumbnail-grid";
import { PdfDropZone } from "@/components/pdf/pdf-drop-zone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { usePdfDocument } from "@/hooks/use-pdf-document";
import { PAGE_SIZES, type PageSizeKey } from "@/lib/pdf/constants";
import { downloadPdf } from "@/lib/pdf/download";
import { resizePdfPages } from "@/lib/pdf/resize";

export default function ResizePdfPage() {
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
  const [sizeKey, setSizeKey] = useState<PageSizeKey | "custom">("A4");
  const [customWidth, setCustomWidth] = useState(595);
  const [customHeight, setCustomHeight] = useState(842);
  const [scaleContent, setScaleContent] = useState(true);
  const [saving, setSaving] = useState(false);

  const width = sizeKey === "custom" ? customWidth : PAGE_SIZES[sizeKey].width;
  const height =
    sizeKey === "custom" ? customHeight : PAGE_SIZES[sizeKey].height;

  const handleSave = useCallback(async () => {
    if (!pdfBytes) return;
    setSaving(true);
    try {
      const result = await resizePdfPages(pdfBytes, {
        width,
        height,
        scaleContent,
      });
      const baseName = (fileName ?? "document").replace(/\.pdf$/i, "");
      await downloadPdf(result, `${baseName}-resized.pdf`);
    } finally {
      setSaving(false);
    }
  }, [pdfBytes, width, height, scaleContent, fileName]);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Resize PDF Pages</h1>
      <p className="text-muted-foreground mt-1">
        Change the page size of your PDF. Choose a standard size or enter custom
        dimensions.
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
              <Label>Page size</Label>
              <Select
                value={sizeKey}
                onValueChange={(v) => setSizeKey(v as PageSizeKey | "custom")}
              >
                <SelectTrigger className="mt-1.5 w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAGE_SIZES).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {sizeKey === "custom" && (
              <>
                <div>
                  <Label>Width (pt)</Label>
                  <Input
                    type="number"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(Number(e.target.value))}
                    className="mt-1.5 w-28"
                    min={1}
                  />
                </div>
                <div>
                  <Label>Height (pt)</Label>
                  <Input
                    type="number"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(Number(e.target.value))}
                    className="mt-1.5 w-28"
                    min={1}
                  />
                </div>
              </>
            )}

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={scaleContent}
                onChange={(e) => setScaleContent(e.target.checked)}
                className="accent-primary"
              />
              Scale content to fit
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={reset}>
              <RiDeleteBin6Line data-icon="inline-start" />
              Remove PDF
            </Button>

            <div className="ml-auto flex items-center gap-2">
              <Badge>
                {pageCount} page{pageCount !== 1 ? "s" : ""} →{" "}
                {Math.round(width)} × {Math.round(height)} pt
              </Badge>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <RiLoader4Line className="size-4 animate-spin" />
                ) : (
                  <RiDownload2Line data-icon="inline-start" />
                )}
                Resize & Download
              </Button>
            </div>
          </div>

          <PageThumbnailGrid thumbnails={thumbnails} />
        </div>
      )}
    </div>
  );
}
