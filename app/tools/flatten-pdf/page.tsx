"use client";

import {
  RiDownload2Line,
  RiLoader4Line,
  RiDeleteBin6Line,
} from "@remixicon/react";
import { useState, useCallback } from "react";

import { PdfDropZone } from "@/components/pdf/pdf-drop-zone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadPdf } from "@/lib/pdf/download";
import { flattenPdf } from "@/lib/pdf/flatten";

export default function FlattenPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0]);
    setDone(false);
    setError(null);
  }, []);

  const handleFlatten = useCallback(async () => {
    if (!file) return;
    setSaving(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const result = await flattenPdf(bytes);
      const baseName = file.name.replace(/\.pdf$/i, "");
      await downloadPdf(result, `${baseName}-flattened.pdf`);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to flatten PDF.");
    } finally {
      setSaving(false);
    }
  }, [file]);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Flatten PDF</h1>
      <p className="text-muted-foreground mt-1">
        Bake form field values and annotations into the page content, making
        them permanent and non-editable.
      </p>

      <div className="mt-8">
        <PdfDropZone onFiles={handleFiles} compact={!!file} />
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {file && (
        <div className="mt-6 space-y-4">
          <div className="rounded-lg border p-4">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-muted-foreground text-xs">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFile(null);
                setDone(false);
                setError(null);
              }}
            >
              <RiDeleteBin6Line data-icon="inline-start" />
              Remove
            </Button>

            <div className="ml-auto flex items-center gap-2">
              {done && <Badge>Flattened & downloaded</Badge>}
              <Button size="sm" onClick={handleFlatten} disabled={saving}>
                {saving ? (
                  <RiLoader4Line className="size-4 animate-spin" />
                ) : (
                  <RiDownload2Line data-icon="inline-start" />
                )}
                Flatten & Download
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
