"use client";

import {
  RiCloseLine,
  RiDeleteBin6Line,
  RiDownload2Line,
  RiErrorWarningLine,
  RiFileShieldLine,
  RiLoader4Line,
  RiShieldCheckLine,
} from "@remixicon/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PdfDropZone } from "@/components/pdf/pdf-drop-zone";
import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { usePdfDocument } from "@/hooks/use-pdf-document";
import {
  PDF_ACTIVE_CONTENT_CATEGORIES,
  cleanPdfActiveContent,
  inspectPdfActiveContent,
  type CleanPdfActiveContentResult,
  type PdfActiveContentCategory,
  type PdfActiveContentInspection,
} from "@/lib/pdf/active-content";
import { downloadPdfBytes } from "@/lib/pdf/download";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function outputName(name: string | null): string {
  return `${(name ?? "document").replace(/\.pdf$/i, "")}-active-content-removed.pdf`;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export default function PdfActiveContentPage() {
  const {
    pdfBytes,
    pageCount,
    fileName,
    loading,
    error: loadError,
    loadFile,
    reset,
  } = usePdfDocument({ renderThumbnails: false });
  const [inspection, setInspection] =
    useState<PdfActiveContentInspection | null>(null);
  const [selected, setSelected] = useState<Set<PdfActiveContentCategory>>(
    new Set(),
  );
  const [acknowledged, setAcknowledged] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState({ percent: 0, label: "" });
  const [result, setResult] = useState<CleanPdfActiveContentResult | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!pdfBytes) {
      setInspection(null);
      return;
    }
    setInspecting(true);
    setInspection(null);
    setSelected(new Set());
    setAcknowledged(false);
    setResult(null);
    setError(null);
    void inspectPdfActiveContent(pdfBytes)
      .then((value) => {
        if (!cancelled) setInspection(value);
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not inspect active content in this PDF.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setInspecting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pdfBytes]);

  const selectedCount = useMemo(
    () =>
      [...selected].reduce(
        (total, category) => total + (inspection?.counts[category] ?? 0),
        0,
      ),
    [inspection, selected],
  );

  const invalidate = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const handleClean = useCallback(async () => {
    if (!pdfBytes || !selected.size || !acknowledged) return;
    setWorking(true);
    invalidate();
    try {
      setProgress({ percent: 18, label: "Reviewing selected structures…" });
      await delay(90);
      setProgress({ percent: 54, label: "Removing active references…" });
      const cleaned = await cleanPdfActiveContent(pdfBytes, [...selected]);
      setProgress({ percent: 88, label: "Re-opening the PDF to verify it…" });
      await delay(120);
      setResult(cleaned);
      setProgress({ percent: 100, label: "Verified" });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not clean active content from this PDF.",
      );
    } finally {
      setWorking(false);
    }
  }, [acknowledged, invalidate, pdfBytes, selected]);

  const handleReset = useCallback(() => {
    reset();
    setInspection(null);
    setSelected(new Set());
    setAcknowledged(false);
    setResult(null);
    setError(null);
    setProgress({ percent: 0, label: "" });
  }, [reset]);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        PDF Active Content Inspector
      </h1>
      <p className="mt-1 text-muted-foreground">
        Find and selectively remove scripts, automatic actions, external
        actions, attachments, interactive media, and XFA content.
      </p>
      <PrivacyBanner>
        Your PDF is inspected and rewritten locally in this browser. It is never
        uploaded or sent to a server.
      </PrivacyBanner>

      <div className="mt-4 flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-6">
        <RiErrorWarningLine className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <p>
          This is a structural inspection, not antivirus or malware detection. A
          clean report is not a safety verdict, and removing interactive
          features can change how a document works. For the strongest static
          copy, use Permanent Redaction or strong PDF compression to rebuild
          pages as images.
        </p>
      </div>

      <div className="mt-8">
        <PdfDropZone
          compact={!!pdfBytes}
          label={pdfBytes ? "Choose a different PDF" : undefined}
          onFiles={(files) => {
            handleReset();
            void loadFile(files[0]);
          }}
        />
      </div>

      {(loading || inspecting) && (
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <RiLoader4Line className="size-5 animate-spin" aria-hidden />
          {loading
            ? "Reading the local PDF…"
            : "Inspecting reachable PDF structures…"}
        </div>
      )}
      {loadError && (
        <p className="mt-4 text-sm text-destructive">{loadError}</p>
      )}
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {pdfBytes && inspection && !loading && !inspecting && (
        <div className="mt-6 space-y-6">
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-2xl font-semibold tabular-nums">
                {inspection.total}
              </p>
              <p className="text-sm text-muted-foreground">
                structural signals found
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-2xl font-semibold tabular-nums">{pageCount}</p>
              <p className="text-sm text-muted-foreground">
                {pageCount === 1 ? "page" : "pages"}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-2xl font-semibold tabular-nums">
                {formatBytes(pdfBytes.length)}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {fileName}
              </p>
            </div>
          </section>

          {inspection.total === 0 ? (
            <section className="flex gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-5 text-sm">
              <RiShieldCheckLine className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              <div>
                <p className="font-medium">No covered active content found</p>
                <p className="mt-1 text-muted-foreground">
                  The inspector found none of the structures it knows how to
                  classify. This does not prove the file is benign or safe.
                </p>
              </div>
            </section>
          ) : (
            <>
              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-medium">Choose content to remove</h2>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={working}
                      onClick={() => {
                        setSelected(
                          new Set(
                            PDF_ACTIVE_CONTENT_CATEGORIES.filter(
                              (category) => inspection.counts[category.id] > 0,
                            ).map((category) => category.id),
                          ),
                        );
                        setAcknowledged(false);
                        invalidate();
                      }}
                    >
                      Select found
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={working}
                      onClick={() => {
                        setSelected(new Set());
                        setAcknowledged(false);
                        invalidate();
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                {PDF_ACTIVE_CONTENT_CATEGORIES.map((category) => {
                  const count = inspection.counts[category.id];
                  return (
                    <label
                      key={category.id}
                      aria-label={`${category.label}: ${count} found`}
                      className={`flex gap-3 rounded-lg border p-4 ${count ? "cursor-pointer" : "opacity-55"}`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 size-4 accent-primary"
                        checked={selected.has(category.id)}
                        disabled={working || count === 0}
                        onChange={(event) => {
                          setSelected((current) => {
                            const next = new Set(current);
                            if (event.target.checked) next.add(category.id);
                            else next.delete(category.id);
                            return next;
                          });
                          setAcknowledged(false);
                          invalidate();
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-medium">
                            {category.label}
                          </span>
                          <span className="rounded-md bg-muted px-2 py-1 text-xs tabular-nums">
                            {count}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {category.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </section>

              <details className="rounded-lg border p-4">
                <summary className="cursor-pointer text-sm font-medium">
                  Review structural findings ({inspection.findings.length})
                </summary>
                <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                  {inspection.findings.slice(0, 150).map((finding, index) => (
                    <div
                      key={`${finding.category}-${finding.kind}-${index}`}
                      className="rounded-md bg-muted/40 px-3 py-2 text-xs"
                    >
                      <p className="font-medium">{finding.kind}</p>
                      <p className="mt-1 text-muted-foreground">
                        {finding.detail}
                      </p>
                    </div>
                  ))}
                  {inspection.findings.length > 150 && (
                    <p className="text-xs text-muted-foreground">
                      Showing the first 150 findings.
                    </p>
                  )}
                </div>
              </details>

              {selectedCount > 0 && (
                <label className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 accent-primary"
                    checked={acknowledged}
                    disabled={working}
                    onChange={(event) => {
                      setAcknowledged(event.target.checked);
                      invalidate();
                    }}
                  />
                  <span>
                    I understand that removing these structures can disable
                    links, automation, attachments, media, or XFA form
                    behaviour. Visible page content is not scanned for malware.
                  </span>
                </label>
              )}
            </>
          )}

          {working && (
            <output className="block overflow-hidden rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-3 text-sm font-medium">
                <span className="flex items-center gap-2">
                  <RiLoader4Line className="size-5 animate-spin text-primary" />
                  {progress.label}
                </span>
                <span className="tabular-nums">{progress.percent}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </output>
          )}

          {result && (
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-5">
              <div>
                <p className="font-medium">
                  Cleaned PDF re-opened and verified
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Removed {selectedCount} structural signals · before{" "}
                  {formatBytes(pdfBytes.length)} · after{" "}
                  {formatBytes(result.bytes.length)}
                </p>
              </div>
              <Button
                onClick={() =>
                  downloadPdfBytes(result.bytes, outputName(fileName))
                }
              >
                <RiDownload2Line data-icon="inline-start" />
                Download cleaned PDF
              </Button>
            </section>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" disabled={working} onClick={handleReset}>
              <RiCloseLine data-icon="inline-start" />
              Remove PDF
            </Button>
            {inspection.total > 0 && (
              <Button
                variant="destructive"
                disabled={working || selectedCount === 0 || !acknowledged}
                onClick={() => void handleClean()}
              >
                {working ? (
                  <RiLoader4Line
                    className="animate-spin"
                    data-icon="inline-start"
                  />
                ) : selectedCount > 0 ? (
                  <RiDeleteBin6Line data-icon="inline-start" />
                ) : (
                  <RiFileShieldLine data-icon="inline-start" />
                )}
                {working
                  ? "Cleaning and verifying…"
                  : `Remove selected content (${selectedCount})`}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
