"use client";

import {
  RiAttachmentLine,
  RiCloseLine,
  RiDeleteBin6Line,
  RiDownload2Line,
  RiLoader4Line,
} from "@remixicon/react";
import { useCallback, useEffect, useState } from "react";

import { PageThumbnailGrid } from "@/components/pdf/page-thumbnail-grid";
import { PdfDropZone } from "@/components/pdf/pdf-drop-zone";
import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { usePdfDocument } from "@/hooks/use-pdf-document";
import {
  inspectPdfAttachments,
  removePdfAttachments,
} from "@/lib/pdf/attachments";
import type { PdfAttachment } from "@/lib/pdf/attachments";
import { downloadPdfBytes } from "@/lib/pdf/download";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function safeFileName(name: string) {
  const withoutControls = Array.from(name, (character) =>
    character.charCodeAt(0) < 32 ? "_" : character,
  ).join("");
  return withoutControls.replace(/[\\/:*?"<>|]/g, "_") || "attachment";
}

function downloadAttachment(attachment: PdfAttachment) {
  const blob = new Blob([attachment.bytes.slice().buffer], {
    type: attachment.mimeType ?? "application/octet-stream",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = safeFileName(attachment.name);
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export default function PdfAttachmentsPage() {
  const {
    pdfBytes,
    thumbnails,
    fileName,
    loading,
    error: loadError,
    loadFile,
    reset,
  } = usePdfDocument();
  const [attachments, setAttachments] = useState<PdfAttachment[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [inspecting, setInspecting] = useState(false);
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!pdfBytes) {
      setAttachments([]);
      setSelected(new Set());
      return;
    }
    setInspecting(true);
    setError(null);
    void inspectPdfAttachments(pdfBytes)
      .then((found) => {
        if (cancelled) return;
        setAttachments(found);
        setSelected(new Set());
      })
      .catch((failure) => {
        if (!cancelled)
          setError(
            failure instanceof Error
              ? failure.message
              : "Could not inspect this PDF's attachments.",
          );
      })
      .finally(() => {
        if (!cancelled) setInspecting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pdfBytes]);

  const invalidate = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const handleRemove = useCallback(async () => {
    if (!pdfBytes || selected.size === 0) return;
    setWorking(true);
    invalidate();
    try {
      setResult(await removePdfAttachments(pdfBytes, [...selected]));
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not remove the selected attachments.",
      );
    } finally {
      setWorking(false);
    }
  }, [invalidate, pdfBytes, selected]);

  const outputName = `${(fileName ?? "document").replace(/\.pdf$/i, "")}-attachments-removed.pdf`;

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">PDF Attachments</h1>
      <p className="mt-1 text-muted-foreground">
        Inspect, download, or remove files embedded inside a PDF.
      </p>
      <PrivacyBanner>
        Your PDF and its attachments stay in your browser. Nothing is uploaded
        or sent to a server.
      </PrivacyBanner>
      <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        Embedded files can contain malware or unsafe content. This tool does not
        scan them. Download only attachments you trust, and do not open unknown
        files automatically.
      </div>
      <div className="mt-8">
        <PdfDropZone
          compact={!!pdfBytes}
          label={pdfBytes ? "Choose a different PDF" : undefined}
          onFiles={(files) => {
            invalidate();
            void loadFile(files[0]);
          }}
        />
      </div>
      {(loading || inspecting) && (
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <RiLoader4Line className="size-5 animate-spin" />
          {loading ? "Loading and previewing PDF…" : "Inspecting attachments…"}
        </div>
      )}
      {loadError && (
        <p className="mt-4 text-sm text-destructive">{loadError}</p>
      )}
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      {pdfBytes && !loading && !inspecting && (
        <div className="mt-6 space-y-6">
          {attachments.length === 0 ? (
            <div className="rounded-lg border p-5 text-sm text-muted-foreground">
              No embedded file attachments were found in this PDF.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-medium">
                  {attachments.length} embedded{" "}
                  {attachments.length === 1 ? "file" : "files"}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelected(new Set(attachments.map((item) => item.id)));
                      invalidate();
                    }}
                  >
                    Select all
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelected(new Set());
                      invalidate();
                    }}
                  >
                    Clear selection
                  </Button>
                </div>
              </div>
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border p-4"
                >
                  <input
                    type="checkbox"
                    aria-label={`Select ${attachment.name}`}
                    checked={selected.has(attachment.id)}
                    onChange={(event) => {
                      setSelected((current) => {
                        const next = new Set(current);
                        if (event.target.checked) next.add(attachment.id);
                        else next.delete(attachment.id);
                        return next;
                      });
                      invalidate();
                    }}
                    className="size-4 accent-primary"
                  />
                  <RiAttachmentLine className="size-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{attachment.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {attachment.mimeType ?? "Unknown file type"} ·{" "}
                      {formatBytes(attachment.size)}
                    </p>
                    {attachment.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {attachment.description}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadAttachment(attachment)}
                  >
                    <RiDownload2Line className="size-4" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          )}

          {result && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-green-500/30 bg-green-500/5 p-4">
              <div>
                <p className="font-medium">Cleaned PDF is ready</p>
                <p className="text-sm text-muted-foreground">
                  Removed {selected.size}{" "}
                  {selected.size === 1 ? "attachment" : "attachments"} ·{" "}
                  {formatBytes(result.length)}
                </p>
              </div>
              <Button onClick={() => downloadPdfBytes(result, outputName)}>
                <RiDownload2Line className="size-4" />
                Download PDF
              </Button>
            </div>
          )}

          {thumbnails.length > 0 && (
            <PageThumbnailGrid thumbnails={thumbnails} />
          )}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => {
                reset();
                setAttachments([]);
                setSelected(new Set());
                setResult(null);
                setError(null);
              }}
            >
              <RiCloseLine className="size-4" />
              Remove PDF
            </Button>
            {attachments.length > 0 && (
              <Button
                variant="destructive"
                disabled={selected.size === 0 || working}
                onClick={handleRemove}
              >
                {working ? (
                  <RiLoader4Line className="size-4 animate-spin" />
                ) : (
                  <RiDeleteBin6Line className="size-4" />
                )}
                {working ? "Removing…" : `Remove selected (${selected.size})`}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
