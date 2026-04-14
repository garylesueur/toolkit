"use client";

import {
  RiDownload2Line,
  RiLoader4Line,
  RiDeleteBin6Line,
  RiEraserLine,
} from "@remixicon/react";
import { useState, useCallback, useEffect } from "react";

import { PdfDropZone } from "@/components/pdf/pdf-drop-zone";
import { PrivacyBanner } from "@/components/privacy-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { downloadPdf } from "@/lib/pdf/download";
import {
  readPdfMetadata,
  updatePdfMetadata,
  removePdfMetadata,
} from "@/lib/pdf/metadata";
import type { PdfMetadata } from "@/lib/pdf/metadata";

const FIELDS: { key: keyof PdfMetadata; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "author", label: "Author" },
  { key: "subject", label: "Subject" },
  { key: "keywords", label: "Keywords" },
  { key: "creator", label: "Creator" },
  { key: "producer", label: "Producer" },
];

export default function PdfMetadataPage() {
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [metadata, setMetadata] = useState<PdfMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setLoading(true);
    setError(null);
    try {
      const buffer = await f.arrayBuffer();
      const b = new Uint8Array(buffer);
      setBytes(b);
      const meta = await readPdfMetadata(b);
      setMetadata(meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read PDF.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!bytes || !metadata) return;
    setSaving(true);
    try {
      const result = await updatePdfMetadata(bytes, metadata);
      const baseName = (file?.name ?? "document").replace(/\.pdf$/i, "");
      await downloadPdf(result, `${baseName}-metadata.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }, [bytes, metadata, file]);

  const handleStripAll = useCallback(async () => {
    if (!bytes) return;
    setSaving(true);
    try {
      const result = await removePdfMetadata(bytes);
      const baseName = (file?.name ?? "document").replace(/\.pdf$/i, "");
      await downloadPdf(result, `${baseName}-no-metadata.pdf`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to strip metadata.",
      );
    } finally {
      setSaving(false);
    }
  }, [bytes, file]);

  const updateField = useCallback((key: keyof PdfMetadata, value: string) => {
    setMetadata((prev) => (prev ? { ...prev, [key]: value } : prev));
  }, []);

  const reset = useCallback(() => {
    setFile(null);
    setBytes(null);
    setMetadata(null);
    setError(null);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">PDF Metadata Editor</h1>
      <p className="text-muted-foreground mt-1">
        View and edit PDF metadata — title, author, subject, keywords — or strip
        it all.
      </p>
      <PrivacyBanner>
        Your PDFs are processed entirely in your browser. Nothing is stored,
        logged, or sent to a server.
      </PrivacyBanner>

      <div className="mt-8">
        <PdfDropZone onFiles={handleFiles} compact={!!file} />
      </div>

      {loading && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <RiLoader4Line className="text-muted-foreground size-5 animate-spin" />
          <span className="text-muted-foreground text-sm">
            Reading metadata…
          </span>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {metadata && (
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map(({ key, label }) => (
              <div key={key}>
                <Label>{label}</Label>
                <Input
                  value={metadata[key]}
                  onChange={(e) => updateField(key, e.target.value)}
                  className="mt-1.5"
                  placeholder={`No ${label.toLowerCase()}`}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={reset}>
              <RiDeleteBin6Line data-icon="inline-start" />
              Remove PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleStripAll}
              disabled={saving}
            >
              <RiEraserLine data-icon="inline-start" />
              Strip All & Download
            </Button>

            <div className="ml-auto">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <RiLoader4Line className="size-4 animate-spin" />
                ) : (
                  <RiDownload2Line data-icon="inline-start" />
                )}
                Save & Download
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
