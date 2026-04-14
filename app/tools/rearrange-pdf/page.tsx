"use client";

import {
  RiDownload2Line,
  RiLoader4Line,
  RiDeleteBin6Line,
  RiArrowGoBackLine,
} from "@remixicon/react";
import { useState, useCallback, useRef } from "react";

import { PageThumbnail } from "@/components/pdf/page-thumbnail";
import { PdfDropZone } from "@/components/pdf/pdf-drop-zone";
import { PrivacyBanner } from "@/components/privacy-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePdfDocument } from "@/hooks/use-pdf-document";
import { downloadPdf } from "@/lib/pdf/download";
import { rearrangePdfPages } from "@/lib/pdf/rearrange";

export default function RearrangePdfPage() {
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
  const [order, setOrder] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const dragIndexRef = useRef<number | null>(null);

  // Initialize order when thumbnails load
  const handleLoad = useCallback(
    async (files: File[]) => {
      await loadFile(files[0]);
    },
    [loadFile],
  );

  // Set initial order when page count changes
  const effectiveOrder =
    order.length === pageCount
      ? order
      : Array.from({ length: pageCount }, (_, i) => i);

  const handleDragStart = useCallback((_e: React.DragEvent, index: number) => {
    dragIndexRef.current = index;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (_e: React.DragEvent, dropIndex: number) => {
      const dragIndex = dragIndexRef.current;
      if (dragIndex === null || dragIndex === dropIndex) return;

      setOrder(() => {
        const next = [...effectiveOrder];
        const [dragged] = next.splice(dragIndex, 1);
        next.splice(dropIndex, 0, dragged);
        return next;
      });
      dragIndexRef.current = null;
    },
    [effectiveOrder],
  );

  const handleSave = useCallback(async () => {
    if (!pdfBytes) return;
    setSaving(true);
    try {
      const result = await rearrangePdfPages(pdfBytes, effectiveOrder);
      const baseName = (fileName ?? "document").replace(/\.pdf$/i, "");
      await downloadPdf(result, `${baseName}-rearranged.pdf`);
    } finally {
      setSaving(false);
    }
  }, [pdfBytes, effectiveOrder, fileName]);

  const isReordered =
    effectiveOrder.length > 0 && effectiveOrder.some((v, i) => v !== i);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Rearrange PDF Pages</h1>
      <p className="text-muted-foreground mt-1">
        Drag and drop pages to reorder them, then download the result.
      </p>
      <PrivacyBanner>
        Your PDFs are processed entirely in your browser. Nothing is stored,
        logged, or sent to a server.
      </PrivacyBanner>

      <div className="mt-8">
        <PdfDropZone onFiles={handleLoad} compact={!!pdfBytes} />
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
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setOrder(Array.from({ length: pageCount }, (_, i) => i))
              }
              disabled={!isReordered}
            >
              <RiArrowGoBackLine data-icon="inline-start" />
              Reset Order
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                reset();
                setOrder([]);
              }}
            >
              <RiDeleteBin6Line data-icon="inline-start" />
              Remove PDF
            </Button>

            <div className="ml-auto flex items-center gap-2">
              {isReordered && <Badge>Order changed</Badge>}
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!isReordered || saving}
              >
                {saving ? (
                  <RiLoader4Line className="size-4 animate-spin" />
                ) : (
                  <RiDownload2Line data-icon="inline-start" />
                )}
                Save & Download
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {effectiveOrder.map((sourceIndex, displayIndex) => (
              <PageThumbnail
                key={`${sourceIndex}-${displayIndex}`}
                src={thumbnails[sourceIndex]}
                pageNumber={sourceIndex + 1}
                draggable
                onDragStart={(e) => handleDragStart(e, displayIndex)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, displayIndex)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
