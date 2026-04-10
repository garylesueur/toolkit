"use client";

import {
  RiDownload2Line,
  RiLoader4Line,
  RiDeleteBin6Line,
  RiArrowUpLine,
  RiArrowDownLine,
  RiCloseLine,
} from "@remixicon/react";
import { useState, useCallback } from "react";

import { PdfDropZone } from "@/components/pdf/pdf-drop-zone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadPdf } from "@/lib/pdf/download";
import { prepareMergeInput, mergePdfs } from "@/lib/pdf/merge";
import type { MergeInput } from "@/lib/pdf/merge";

export default function MergePdfPage() {
  const [files, setFiles] = useState<MergeInput[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFiles = useCallback(async (newFiles: File[]) => {
    setLoadingFiles(true);
    setError(null);
    try {
      const inputs = await Promise.all(newFiles.map(prepareMergeInput));
      setFiles((prev) => [...prev, ...inputs]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load PDF.");
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const moveFile = useCallback((from: number, direction: -1 | 1) => {
    setFiles((prev) => {
      const to = from + direction;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  }, []);

  const handleMerge = useCallback(async () => {
    if (files.length < 2) return;
    setSaving(true);
    try {
      const result = await mergePdfs(files);
      await downloadPdf(result, "merged.pdf");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Merge failed.");
    } finally {
      setSaving(false);
    }
  }, [files]);

  const totalPages = files.reduce((sum, f) => sum + f.pageCount, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Merge PDF</h1>
      <p className="text-muted-foreground mt-1">
        Combine multiple PDFs into a single file. Drag to reorder before
        merging.
      </p>

      <div className="mt-8">
        <PdfDropZone
          onFiles={addFiles}
          multiple
          compact={files.length > 0}
          label={
            files.length > 0
              ? "Drop more PDFs, or click to browse"
              : "Drop your PDFs here, or click to browse"
          }
        />
      </div>

      {loadingFiles && (
        <div className="mt-4 flex items-center gap-2">
          <RiLoader4Line className="text-muted-foreground size-4 animate-spin" />
          <span className="text-muted-foreground text-sm">Loading…</span>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {files.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setFiles([])}>
              <RiDeleteBin6Line data-icon="inline-start" />
              Clear All
            </Button>

            <div className="ml-auto flex items-center gap-2">
              <Badge>
                {files.length} file{files.length !== 1 ? "s" : ""} ·{" "}
                {totalPages} page{totalPages !== 1 ? "s" : ""}
              </Badge>
              <Button
                size="sm"
                onClick={handleMerge}
                disabled={files.length < 2 || saving}
              >
                {saving ? (
                  <RiLoader4Line className="size-4 animate-spin" />
                ) : (
                  <RiDownload2Line data-icon="inline-start" />
                )}
                Merge & Download
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {files.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => moveFile(i, -1)}
                    disabled={i === 0}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <RiArrowUpLine className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveFile(i, 1)}
                    disabled={i === files.length - 1}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <RiArrowDownLine className="size-4" />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {file.pageCount} page{file.pageCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-muted-foreground hover:text-foreground shrink-0 rounded-md p-1"
                >
                  <RiCloseLine className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
