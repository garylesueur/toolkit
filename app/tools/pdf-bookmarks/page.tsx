"use client";

import {
  RiAddLine,
  RiArrowDownLine,
  RiArrowGoBackLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiArrowUpLine,
  RiBookOpenLine,
  RiCloseLine,
  RiDeleteBin6Line,
  RiDownload2Line,
  RiLoader4Line,
  RiSaveLine,
} from "@remixicon/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PdfDropZone } from "@/components/pdf/pdf-drop-zone";
import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePdfDocument } from "@/hooks/use-pdf-document";
import {
  exportPdfBookmarks,
  removeAllPdfBookmarks,
  replacePdfBookmarks,
  type PdfBookmarkStage,
} from "@/lib/pdf/bookmarks";
import {
  MAX_PDF_BOOKMARK_DEPTH,
  bookmarkImportJson,
  countPdfBookmarks,
  flattenPdfBookmarks,
  nestPdfBookmarkRows,
  type PdfBookmark,
  type PdfBookmarkRow,
} from "@/lib/pdf/bookmarks-options";
import { downloadPdfBytes } from "@/lib/pdf/download";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function baseName(fileName: string | null): string {
  return (fileName ?? "document").replace(/\.pdf$/i, "");
}

function downloadText(text: string, name: string): void {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function stageText(stage: PdfBookmarkStage | null): string {
  if (stage === "export") return "Reading the bookmark tree…";
  if (stage === "import") return "Writing the bookmark tree…";
  if (stage === "remove") return "Removing the bookmark tree…";
  if (stage === "verifying") return "Re-exporting bookmarks for verification…";
  return "Loading the local PDF bookmark engine…";
}

function normaliseDepths(rows: PdfBookmarkRow[]): PdfBookmarkRow[] {
  return rows.map((row, index) => ({
    ...row,
    depth: index === 0 ? 0 : Math.min(row.depth, rows[index - 1].depth + 1),
  }));
}

export default function PdfBookmarksPage() {
  const {
    pdfBytes,
    pageCount,
    fileName,
    loading,
    error: loadError,
    loadFile,
    reset,
  } = usePdfDocument({ renderThumbnails: false });
  const [original, setOriginal] = useState<PdfBookmark[]>([]);
  const [rows, setRows] = useState<PdfBookmarkRow[]>([]);
  const [inspecting, setInspecting] = useState(false);
  const [working, setWorking] = useState(false);
  const [stage, setStage] = useState<PdfBookmarkStage | null>(null);
  const [result, setResult] = useState<{
    bytes: Uint8Array;
    mode: "remove" | "replace";
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    if (!pdfBytes || !pageCount) {
      setOriginal([]);
      setRows([]);
      return () => controller.abort();
    }
    abortRef.current = controller;
    setInspecting(true);
    setStage("loading-engine");
    setOriginal([]);
    setRows([]);
    setResult(null);
    setError(null);
    void exportPdfBookmarks(pdfBytes, pageCount, {
      signal: controller.signal,
      onStage: setStage,
    })
      .then((bookmarks) => {
        setOriginal(bookmarks);
        setRows(flattenPdfBookmarks(bookmarks));
      })
      .catch((cause) => {
        if (!(cause instanceof DOMException && cause.name === "AbortError")) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not inspect this PDF's bookmarks.",
          );
        }
      })
      .finally(() => {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setInspecting(false);
          setStage(null);
        }
      });
    return () => controller.abort();
  }, [pageCount, pdfBytes]);

  const tree = useMemo(() => {
    try {
      return { value: nestPdfBookmarkRows(rows, pageCount), error: null };
    } catch (cause) {
      return {
        value: [] as PdfBookmark[],
        error:
          cause instanceof Error
            ? cause.message
            : "The bookmark tree is invalid.",
      };
    }
  }, [pageCount, rows]);

  const originalCount = countPdfBookmarks(original);

  const invalidate = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const updateRow = useCallback(
    (id: string, updates: Partial<PdfBookmarkRow>) => {
      setRows((current) =>
        current.map((row) => (row.id === id ? { ...row, ...updates } : row)),
      );
      invalidate();
    },
    [invalidate],
  );

  const handleReplace = useCallback(async () => {
    if (!pdfBytes || tree.error || !tree.value.length) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setWorking(true);
    setStage("loading-engine");
    invalidate();
    try {
      const bytes = await replacePdfBookmarks(pdfBytes, pageCount, tree.value, {
        signal: controller.signal,
        onStage: setStage,
      });
      setResult({ bytes, mode: "replace" });
    } catch (cause) {
      setError(
        cause instanceof DOMException && cause.name === "AbortError"
          ? "Bookmark update cancelled."
          : cause instanceof Error
            ? cause.message
            : "Could not update this PDF's bookmarks.",
      );
    } finally {
      abortRef.current = null;
      setWorking(false);
      setStage(null);
    }
  }, [invalidate, pageCount, pdfBytes, tree]);

  const handleRemove = useCallback(async () => {
    if (!pdfBytes || originalCount === 0) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setWorking(true);
    setStage("loading-engine");
    invalidate();
    try {
      const bytes = await removeAllPdfBookmarks(pdfBytes, pageCount, {
        signal: controller.signal,
        onStage: setStage,
      });
      setResult({ bytes, mode: "remove" });
    } catch (cause) {
      setError(
        cause instanceof DOMException && cause.name === "AbortError"
          ? "Bookmark removal cancelled."
          : cause instanceof Error
            ? cause.message
            : "Could not remove this PDF's bookmarks.",
      );
    } finally {
      abortRef.current = null;
      setWorking(false);
      setStage(null);
    }
  }, [invalidate, originalCount, pageCount, pdfBytes]);

  const handleReset = useCallback(() => {
    abortRef.current?.abort();
    reset();
    setOriginal([]);
    setRows([]);
    setResult(null);
    setError(null);
  }, [reset]);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">PDF Bookmarks</h1>
      <p className="mt-1 text-muted-foreground">
        Inspect, export, build, replace, or remove a PDF&apos;s navigation tree.
      </p>
      <PrivacyBanner>
        Your PDF and bookmark data stay in a disposable WebAssembly worker in
        this browser. Nothing is uploaded.
      </PrivacyBanner>
      <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-6">
        Applying this editor replaces the existing bookmark tree. Destinations
        use page starts; specialised zoom levels and exact coordinates are not
        preserved. Export the current JSON first if you need a backup.
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
        <div className="mt-8 space-y-3 rounded-lg border bg-muted/20 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <RiLoader4Line className="size-5 animate-spin text-primary" />
            {loading ? "Reading local PDF structure…" : stageText(stage)}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[58%] animate-pulse rounded-full bg-primary" />
          </div>
          {inspecting && (
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => abortRef.current?.abort()}
              >
                Cancel inspection
              </Button>
            </div>
          )}
        </div>
      )}
      {loadError && (
        <p className="mt-4 text-sm text-destructive">{loadError}</p>
      )}
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {pdfBytes && !loading && !inspecting && (
        <div className="mt-6 space-y-6">
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-5">
            <div>
              <p className="truncate text-sm font-medium">{fileName}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {pageCount} {pageCount === 1 ? "page" : "pages"} ·{" "}
                {formatBytes(pdfBytes.length)} · {originalCount} existing{" "}
                {originalCount === 1 ? "bookmark" : "bookmarks"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={working || originalCount === 0}
                onClick={() =>
                  downloadText(
                    bookmarkImportJson(original),
                    `${baseName(fileName)}-bookmarks.json`,
                  )
                }
              >
                <RiDownload2Line data-icon="inline-start" />
                Export JSON
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={working}
                onClick={() => {
                  setRows(flattenPdfBookmarks(original));
                  invalidate();
                }}
              >
                <RiArrowGoBackLine data-icon="inline-start" />
                Reset editor
              </Button>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-medium">Bookmark tree</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Row order is navigation order. Indentation makes a row a child
                of the nearest preceding parent.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={working || rows.length >= 1_000}
              onClick={() => {
                setRows((current) => [
                  ...current,
                  {
                    id: crypto.randomUUID(),
                    title: `Bookmark ${current.length + 1}`,
                    page: Math.min(pageCount, current.at(-1)?.page ?? 1),
                    depth: 0,
                  },
                ]);
                invalidate();
              }}
            >
              <RiAddLine data-icon="inline-start" />
              Add bookmark
            </Button>
          </div>

          {rows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              This PDF has no bookmarks. Add one to build a navigation tree.
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((row, index) => {
                const maxIndent =
                  index === 0
                    ? 0
                    : Math.min(
                        rows[index - 1].depth + 1,
                        MAX_PDF_BOOKMARK_DEPTH - 1,
                      );
                return (
                  <article
                    key={row.id}
                    className="rounded-lg border p-4"
                    style={{ marginLeft: `${Math.min(row.depth, 5) * 20}px` }}
                  >
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_7rem_auto] md:items-end">
                      <div>
                        <label
                          htmlFor={`bookmark-title-${row.id}`}
                          className="text-xs font-medium"
                        >
                          Title
                        </label>
                        <Input
                          id={`bookmark-title-${row.id}`}
                          value={row.title}
                          maxLength={240}
                          disabled={working}
                          className="mt-1"
                          onChange={(event) =>
                            updateRow(row.id, { title: event.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`bookmark-page-${row.id}`}
                          className="text-xs font-medium"
                        >
                          Page
                        </label>
                        <Input
                          id={`bookmark-page-${row.id}`}
                          type="number"
                          min={1}
                          max={pageCount}
                          value={row.page}
                          disabled={working}
                          className="mt-1"
                          onChange={(event) =>
                            updateRow(row.id, {
                              page: Number(event.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          size="icon-sm"
                          variant="outline"
                          aria-label={`Move ${row.title || "bookmark"} up`}
                          disabled={working || index === 0}
                          onClick={() => {
                            setRows((current) => {
                              const next = [...current];
                              [next[index - 1], next[index]] = [
                                next[index],
                                next[index - 1],
                              ];
                              return normaliseDepths(next);
                            });
                            invalidate();
                          }}
                        >
                          <RiArrowUpLine />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="outline"
                          aria-label={`Move ${row.title || "bookmark"} down`}
                          disabled={working || index === rows.length - 1}
                          onClick={() => {
                            setRows((current) => {
                              const next = [...current];
                              [next[index], next[index + 1]] = [
                                next[index + 1],
                                next[index],
                              ];
                              return normaliseDepths(next);
                            });
                            invalidate();
                          }}
                        >
                          <RiArrowDownLine />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="outline"
                          aria-label={`Outdent ${row.title || "bookmark"}`}
                          disabled={working || row.depth === 0}
                          onClick={() =>
                            updateRow(row.id, { depth: row.depth - 1 })
                          }
                        >
                          <RiArrowLeftLine />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="outline"
                          aria-label={`Indent ${row.title || "bookmark"}`}
                          disabled={working || row.depth >= maxIndent}
                          onClick={() =>
                            updateRow(row.id, { depth: row.depth + 1 })
                          }
                        >
                          <RiArrowRightLine />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Delete ${row.title || "bookmark"}`}
                          disabled={working}
                          onClick={() => {
                            setRows((current) =>
                              normaliseDepths(
                                current.filter((item) => item.id !== row.id),
                              ),
                            );
                            invalidate();
                          }}
                        >
                          <RiDeleteBin6Line />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-5 text-xs">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={row.bold ?? false}
                          disabled={working}
                          className="size-4 accent-primary"
                          onChange={(event) =>
                            updateRow(row.id, {
                              bold: event.target.checked || undefined,
                            })
                          }
                        />
                        Bold
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={row.italic ?? false}
                          disabled={working}
                          className="size-4 accent-primary"
                          onChange={(event) =>
                            updateRow(row.id, {
                              italic: event.target.checked || undefined,
                            })
                          }
                        />
                        Italic
                      </label>
                      <span className="text-muted-foreground">
                        Level {row.depth + 1}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {tree.error && (
            <p className="text-sm text-destructive">{tree.error}</p>
          )}

          {working && (
            <output className="block overflow-hidden rounded-lg border bg-muted/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium">
                <span className="flex items-center gap-2">
                  <RiLoader4Line className="size-5 animate-spin text-primary" />
                  {stageText(stage)}
                </span>
                <span className="tabular-nums">
                  {stage === "verifying" ? "92%" : "64%"}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full animate-pulse rounded-full bg-primary transition-all ${
                    stage === "verifying" ? "w-[92%]" : "w-[64%]"
                  }`}
                />
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => abortRef.current?.abort()}
                >
                  Cancel bookmark operation
                </Button>
              </div>
            </output>
          )}

          {result && (
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-5">
              <div>
                <p className="font-medium">
                  {result.mode === "replace"
                    ? "Bookmarked PDF verified"
                    : "Bookmark-free PDF verified"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {result.mode === "replace"
                    ? `${countPdfBookmarks(tree.value)} bookmarks`
                    : `${originalCount} bookmarks removed`}{" "}
                  · before {formatBytes(pdfBytes.length)} · after{" "}
                  {formatBytes(result.bytes.length)}
                </p>
              </div>
              <Button
                onClick={() =>
                  downloadPdfBytes(
                    result.bytes,
                    `${baseName(fileName)}-${
                      result.mode === "replace"
                        ? "bookmarked"
                        : "bookmarks-removed"
                    }.pdf`,
                  )
                }
              >
                <RiDownload2Line data-icon="inline-start" />
                Download PDF
              </Button>
            </section>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" disabled={working} onClick={handleReset}>
              <RiCloseLine data-icon="inline-start" />
              Remove PDF
            </Button>
            {originalCount > 0 && (
              <Button
                variant="destructive"
                disabled={working}
                onClick={() => void handleRemove()}
              >
                <RiDeleteBin6Line data-icon="inline-start" />
                Remove all bookmarks
              </Button>
            )}
            <Button
              disabled={working || !!tree.error || tree.value.length === 0}
              onClick={() => void handleReplace()}
            >
              {working ? (
                <RiLoader4Line
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : rows.length === 0 ? (
                <RiBookOpenLine data-icon="inline-start" />
              ) : (
                <RiSaveLine data-icon="inline-start" />
              )}
              {working ? "Processing bookmarks…" : "Apply bookmark tree"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
