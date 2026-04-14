"use client";

import {
  RiDownload2Line,
  RiLoader4Line,
  RiDeleteBin6Line,
  RiCheckboxMultipleLine,
  RiCloseLine,
} from "@remixicon/react";
import { useState, useCallback } from "react";

import { PageThumbnailGrid } from "@/components/pdf/page-thumbnail-grid";
import { PdfDropZone } from "@/components/pdf/pdf-drop-zone";
import { PrivacyBanner } from "@/components/privacy-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePdfDocument } from "@/hooks/use-pdf-document";
import { downloadPdf } from "@/lib/pdf/download";
import { extractPdfPages } from "@/lib/pdf/extract";

export default function ExtractPdfPagesPage() {
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
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  const togglePage = useCallback((index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(Array.from({ length: pageCount }, (_, i) => i)));
  }, [pageCount]);

  const handleSave = useCallback(async () => {
    if (!pdfBytes || selected.size === 0) return;
    setSaving(true);
    try {
      const indices = Array.from(selected).sort((a, b) => a - b);
      const result = await extractPdfPages(pdfBytes, indices);
      const baseName = (fileName ?? "document").replace(/\.pdf$/i, "");
      await downloadPdf(result, `${baseName}-extracted.pdf`);
    } finally {
      setSaving(false);
    }
  }, [pdfBytes, selected, fileName]);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Extract PDF Pages</h1>
      <p className="text-muted-foreground mt-1">
        Select the pages you want to keep and download a new PDF with just those
        pages.
      </p>
      <PrivacyBanner>
        Your PDFs are processed entirely in your browser. Nothing is stored,
        logged, or sent to a server.
      </PrivacyBanner>

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
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={selectAll}>
              <RiCheckboxMultipleLine data-icon="inline-start" />
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelected(new Set())}
              disabled={selected.size === 0}
            >
              <RiCloseLine data-icon="inline-start" />
              Clear Selection
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                reset();
                setSelected(new Set());
              }}
            >
              <RiDeleteBin6Line data-icon="inline-start" />
              Remove PDF
            </Button>

            <div className="ml-auto flex items-center gap-2">
              {selected.size > 0 && (
                <Badge>
                  {selected.size} of {pageCount} page
                  {selected.size !== 1 ? "s" : ""} selected
                </Badge>
              )}
              <Button
                size="sm"
                onClick={handleSave}
                disabled={selected.size === 0 || saving}
              >
                {saving ? (
                  <RiLoader4Line className="size-4 animate-spin" />
                ) : (
                  <RiDownload2Line data-icon="inline-start" />
                )}
                Extract & Download
              </Button>
            </div>
          </div>

          <PageThumbnailGrid
            thumbnails={thumbnails}
            selectedPages={selected}
            onTogglePage={togglePage}
          />
        </div>
      )}
    </div>
  );
}
