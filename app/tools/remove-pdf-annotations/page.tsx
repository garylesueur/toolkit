"use client";

import {
  RiCloseLine,
  RiDeleteBin6Line,
  RiDownload2Line,
  RiErrorWarningLine,
  RiFileTextLine,
  RiLoader4Line,
  RiShieldCheckLine,
} from "@remixicon/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PdfDropZone } from "@/components/pdf/pdf-drop-zone";
import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePdfDocument } from "@/hooks/use-pdf-document";
import {
  PDF_ANNOTATION_GROUPS,
  inspectPdfAnnotations,
  removePdfAnnotations,
  resolveAnnotationPages,
  type PdfAnnotationGroupId,
  type PdfAnnotationInspection,
} from "@/lib/pdf/annotations";
import { downloadPdfBytes } from "@/lib/pdf/download";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function outputName(fileName: string | null): string {
  return `${(fileName ?? "document").replace(/\.pdf$/i, "")}-markup-removed.pdf`;
}

export default function RemovePdfAnnotationsPage() {
  const {
    pdfBytes,
    pageCount,
    fileName,
    loading,
    error: loadError,
    loadFile,
    reset,
  } = usePdfDocument({ renderThumbnails: false });
  const [inspection, setInspection] = useState<PdfAnnotationInspection | null>(
    null,
  );
  const [selected, setSelected] = useState<Set<PdfAnnotationGroupId>>(
    new Set(),
  );
  const [pages, setPages] = useState("");
  const [acknowledgedRedactions, setAcknowledgedRedactions] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<{
    bytes: Uint8Array;
    removed: number;
  } | null>(null);
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
    setAcknowledgedRedactions(false);
    setResult(null);
    setError(null);
    void inspectPdfAnnotations(pdfBytes)
      .then((value) => {
        if (!cancelled) setInspection(value);
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not inspect this PDF's annotations.",
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

  const pageSelection = useMemo(() => {
    if (!pageCount)
      return { pages: [] as number[], error: null as string | null };
    try {
      return { pages: resolveAnnotationPages(pages, pageCount), error: null };
    } catch (cause) {
      return {
        pages: [] as number[],
        error: cause instanceof Error ? cause.message : "Invalid page range.",
      };
    }
  }, [pageCount, pages]);

  const groupCounts = useMemo(() => {
    const counts = new Map<PdfAnnotationGroupId, number>();
    for (const annotation of inspection?.removable ?? []) {
      if (!pageSelection.pages.includes(annotation.pageNumber)) continue;
      counts.set(annotation.group, (counts.get(annotation.group) ?? 0) + 1);
    }
    return counts;
  }, [inspection, pageSelection.pages]);

  const selectedCount = [...selected].reduce(
    (total, group) => total + (groupCounts.get(group) ?? 0),
    0,
  );
  const redactionsSelected = selected.has("redactions");

  const invalidate = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const handleRemove = useCallback(async () => {
    if (!pdfBytes || !selected.size || pageSelection.error) return;
    setWorking(true);
    invalidate();
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 80));
      setResult(
        await removePdfAnnotations(pdfBytes, {
          groups: [...selected],
          pages: pageSelection.pages,
        }),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not remove the selected PDF annotations.",
      );
    } finally {
      setWorking(false);
    }
  }, [invalidate, pageSelection, pdfBytes, selected]);

  const handleReset = useCallback(() => {
    reset();
    setInspection(null);
    setSelected(new Set());
    setPages("");
    setAcknowledgedRedactions(false);
    setResult(null);
    setError(null);
  }, [reset]);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        Remove PDF Comments &amp; Markup
      </h1>
      <p className="mt-1 text-muted-foreground">
        Inspect and remove selected annotation types without flattening pages.
      </p>
      <PrivacyBanner>
        Your PDF is inspected and rewritten locally in this browser. It is never
        uploaded or sent to a server.
      </PrivacyBanner>

      <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-6">
        This removes annotation objects; it does not erase underlying page
        content. Links, form widgets, file attachments, and unsupported
        interactive annotations are preserved. For sensitive information, use
        Permanent Redaction instead.
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
            ? "Reading local PDF structure…"
            : "Classifying comments and markup…"}
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
              <p className="text-sm text-muted-foreground">total annotations</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-2xl font-semibold tabular-nums">
                {inspection.removable.length}
              </p>
              <p className="text-sm text-muted-foreground">removable markup</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-2xl font-semibold tabular-nums">
                {inspection.preserved.links +
                  inspection.preserved.formWidgets +
                  inspection.preserved.other}
              </p>
              <p className="text-sm text-muted-foreground">preserved items</p>
            </div>
          </section>

          <section className="grid gap-4 rounded-lg border p-5 sm:grid-cols-2">
            <div>
              <p className="truncate text-sm font-medium">{fileName}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {countLabel(pageCount, "page")} · {formatBytes(pdfBytes.length)}
              </p>
            </div>
            <div>
              <Label htmlFor="annotation-pages">Pages to clean</Label>
              <Input
                id="annotation-pages"
                value={pages}
                disabled={working}
                placeholder={`All pages, or e.g. 1-${Math.min(pageCount, 5)}`}
                className="mt-1"
                onChange={(event) => {
                  setPages(event.target.value);
                  setSelected(new Set());
                  setAcknowledgedRedactions(false);
                  invalidate();
                }}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Leave blank for all pages, or use 1-3, 5.
              </p>
              {pageSelection.error && (
                <p className="mt-1 text-xs text-destructive">
                  {pageSelection.error}
                </p>
              )}
            </div>
          </section>

          {inspection.removable.length === 0 ? (
            <div className="rounded-lg border p-5 text-sm text-muted-foreground">
              No removable comments, highlights, drawings, stamps, or redaction
              annotations were found in this PDF.
            </div>
          ) : (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-medium">Choose markup types</h2>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={working}
                    onClick={() => {
                      setSelected(
                        new Set(
                          PDF_ANNOTATION_GROUPS.filter(
                            (group) => (groupCounts.get(group.id) ?? 0) > 0,
                          ).map((group) => group.id),
                        ),
                      );
                      invalidate();
                    }}
                  >
                    Select available
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={working}
                    onClick={() => {
                      setSelected(new Set());
                      setAcknowledgedRedactions(false);
                      invalidate();
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {PDF_ANNOTATION_GROUPS.map((group) => {
                const count = groupCounts.get(group.id) ?? 0;
                return (
                  <label
                    key={group.id}
                    aria-label={`${group.label}: ${count} found`}
                    className={`flex gap-3 rounded-lg border p-4 ${
                      count === 0 ? "opacity-55" : "cursor-pointer"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 size-4 accent-primary"
                      checked={selected.has(group.id)}
                      disabled={working || count === 0}
                      onChange={(event) => {
                        setSelected((current) => {
                          const next = new Set(current);
                          if (event.target.checked) next.add(group.id);
                          else next.delete(group.id);
                          return next;
                        });
                        if (
                          group.id === "redactions" &&
                          !event.target.checked
                        ) {
                          setAcknowledgedRedactions(false);
                        }
                        invalidate();
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {group.label}
                        </span>
                        <span className="rounded-md bg-muted px-2 py-1 text-xs tabular-nums">
                          {count}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {group.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </section>
          )}

          {(inspection.preserved.links > 0 ||
            inspection.preserved.formWidgets > 0 ||
            inspection.preserved.other > 0) && (
            <section className="flex gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
              <RiShieldCheckLine className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              <div>
                <p className="font-medium">Interactive items are protected</p>
                <p className="mt-1 text-muted-foreground">
                  Preserving {countLabel(inspection.preserved.links, "link")},{" "}
                  {countLabel(inspection.preserved.formWidgets, "form widget")},
                  and{" "}
                  {countLabel(inspection.preserved.other, "other annotation")}.
                </p>
              </div>
            </section>
          )}

          {redactionsSelected && (
            <label className="flex gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-destructive"
                checked={acknowledgedRedactions}
                disabled={working}
                onChange={(event) => {
                  setAcknowledgedRedactions(event.target.checked);
                  invalidate();
                }}
              />
              <RiErrorWarningLine className="mt-0.5 size-5 shrink-0 text-destructive" />
              <span>
                I understand that removing redaction annotations can reveal the
                original text or image underneath. This is not secure redaction.
              </span>
            </label>
          )}

          {inspection.removable.length > 0 && (
            <details className="rounded-lg border p-4">
              <summary className="cursor-pointer text-sm font-medium">
                Review detected markup ({inspection.removable.length})
              </summary>
              <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                {inspection.removable.slice(0, 100).map((annotation) => (
                  <div
                    key={annotation.id}
                    className="rounded-md bg-muted/40 px-3 py-2 text-xs"
                  >
                    <p className="font-medium">
                      Page {annotation.pageNumber} · {annotation.subtype}
                    </p>
                    {(annotation.author || annotation.contents) && (
                      <p className="mt-1 truncate text-muted-foreground">
                        {[annotation.author, annotation.contents]
                          .filter(Boolean)
                          .join(" — ")}
                      </p>
                    )}
                  </div>
                ))}
                {inspection.removable.length > 100 && (
                  <p className="text-xs text-muted-foreground">
                    Showing the first 100 annotations.
                  </p>
                )}
              </div>
            </details>
          )}

          {working && (
            <output className="block overflow-hidden rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-3 text-sm font-medium">
                <span className="flex items-center gap-2">
                  <RiLoader4Line className="size-5 animate-spin text-primary" />
                  Rewriting and verifying the cleaned PDF…
                </span>
                <span className="tabular-nums">72%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[72%] animate-pulse rounded-full bg-primary" />
              </div>
            </output>
          )}

          {result && (
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-5">
              <div>
                <p className="font-medium">Cleaned PDF verified</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Removed {countLabel(result.removed, "annotation")} · before{" "}
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
            <Button
              variant="destructive"
              disabled={
                working ||
                selectedCount === 0 ||
                !!pageSelection.error ||
                (redactionsSelected && !acknowledgedRedactions)
              }
              onClick={() => void handleRemove()}
            >
              {working ? (
                <RiLoader4Line
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : selectedCount > 0 ? (
                <RiDeleteBin6Line data-icon="inline-start" />
              ) : (
                <RiFileTextLine data-icon="inline-start" />
              )}
              {working
                ? "Removing markup…"
                : `Remove selected markup (${selectedCount})`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
