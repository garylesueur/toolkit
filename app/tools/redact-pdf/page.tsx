"use client";

import {
  RiAlertLine,
  RiArrowGoBackLine,
  RiDeleteBin6Line,
  RiDownload2Line,
  RiLoader4Line,
  RiShieldCheckLine,
} from "@remixicon/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PdfDropZone } from "@/components/pdf/pdf-drop-zone";
import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { usePdfDocument } from "@/hooks/use-pdf-document";
import { downloadPdfBytes } from "@/lib/pdf/download";
import { redactPdf } from "@/lib/pdf/redact";
import {
  REDACTION_QUALITY,
  normaliseRedactionBox,
  redactionBoxFromPercentages,
  redactionPreviewStyle,
  redactionsOnPage,
} from "@/lib/pdf/redact-options";
import type { RedactionBox, RedactionQuality } from "@/lib/pdf/redact-options";
import { renderPageThumbnail } from "@/lib/pdf/thumbnails";

type Draft = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  width: number;
  height: number;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function RedactPdfPage() {
  const {
    pdfBytes,
    pageCount,
    thumbnails,
    fileName,
    loading,
    error: loadError,
    loadFile,
    reset,
  } = usePdfDocument();
  const [activePage, setActivePage] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [boxes, setBoxes] = useState<RedactionBox[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [quality, setQuality] = useState<RedactionQuality>("screen");
  const [preciseArea, setPreciseArea] = useState({
    left: 6,
    top: 8,
    width: 60,
    height: 10,
  });
  const [acknowledged, setAcknowledged] = useState(false);
  const [working, setWorking] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [stage, setStage] = useState<"rendering" | "verifying">("rendering");
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const invalidate = useCallback(() => {
    setResult(null);
    setSaveError(null);
  }, []);

  useEffect(() => {
    if (!pdfBytes) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setPreview(null);
    void renderPageThumbnail(pdfBytes, activePage, 1).then((image) => {
      if (!cancelled) setPreview(image);
    });
    return () => {
      cancelled = true;
    };
  }, [activePage, pdfBytes]);

  const currentBoxes = useMemo(
    () => redactionsOnPage(boxes, activePage),
    [activePage, boxes],
  );
  const preciseAreaValid =
    Object.values(preciseArea).every(Number.isFinite) &&
    preciseArea.left >= 0 &&
    preciseArea.top >= 0 &&
    preciseArea.width > 0.2 &&
    preciseArea.height > 0.2 &&
    preciseArea.left + preciseArea.width <= 100 &&
    preciseArea.top + preciseArea.height <= 100;

  const draftBox = useMemo(() => {
    if (!draft) return null;
    return normaliseRedactionBox(
      activePage,
      draft.startX,
      draft.startY,
      draft.endX,
      draft.endY,
      draft.width,
      draft.height,
    );
  }, [activePage, draft]);

  const relativePoint = (
    event: React.PointerEvent<HTMLDivElement>,
  ): { x: number; y: number; width: number; height: number } => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
      width: bounds.width,
      height: bounds.height,
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (working || !preview) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = relativePoint(event);
    setDraft({
      startX: point.x,
      startY: point.y,
      endX: point.x,
      endY: point.y,
      width: point.width,
      height: point.height,
    });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draft) return;
    const point = relativePoint(event);
    setDraft((current) =>
      current ? { ...current, endX: point.x, endY: point.y } : current,
    );
  };

  const finishDraft = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draft) return;
    const point = relativePoint(event);
    const box = normaliseRedactionBox(
      activePage,
      draft.startX,
      draft.startY,
      point.x,
      point.y,
      draft.width,
      draft.height,
    );
    setDraft(null);
    if (box.width <= 0.002 || box.height <= 0.002) return;
    setBoxes((current) => [...current, box]);
    invalidate();
  };

  const handleRedact = useCallback(async () => {
    if (!pdfBytes) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setWorking(true);
    setCompleted(0);
    setStage("rendering");
    setResult(null);
    setSaveError(null);
    try {
      setResult(
        await redactPdf(
          pdfBytes,
          { boxes, quality, signal: controller.signal },
          (progress) => {
            setStage(progress.stage);
            setCompleted(progress.completed);
          },
        ),
      );
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError")) {
        setSaveError(
          cause instanceof Error ? cause.message : "Redaction failed.",
        );
      }
    } finally {
      abortRef.current = null;
      setWorking(false);
    }
  }, [boxes, pdfBytes, quality]);

  const handleReset = useCallback(() => {
    abortRef.current?.abort();
    reset();
    setActivePage(0);
    setPreview(null);
    setBoxes([]);
    setDraft(null);
    setAcknowledged(false);
    setWorking(false);
    setCompleted(0);
    setResult(null);
    setSaveError(null);
  }, [reset]);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        Permanently Redact PDF
      </h1>
      <p className="text-muted-foreground mt-1">
        Draw sensitive areas, then rasterise and rebuild every page so the
        original hidden content is not carried into the output.
      </p>
      <PrivacyBanner>
        Your PDF is rendered, redacted, and structurally verified entirely in
        this browser. Nothing is uploaded.
      </PrivacyBanner>

      <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex items-start gap-3">
          <RiAlertLine
            className="mt-0.5 size-5 shrink-0 text-amber-500"
            aria-hidden
          />
          <div>
            <p className="text-sm font-medium">
              This is permanent flattened redaction, not a removable overlay
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Every page becomes a JPEG image. Selectable text, search, links,
              forms, signatures, annotations, attachments, layers, bookmarks,
              accessibility structure, and revision history are removed.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <PdfDropZone
          compact={!!pdfBytes}
          label={pdfBytes ? "Choose a different PDF" : undefined}
          onFiles={(files) => {
            handleReset();
            void loadFile(files[0]);
          }}
        />
      </div>

      {loading && (
        <div className="text-muted-foreground mt-8 flex items-center justify-center gap-2 text-sm">
          <RiLoader4Line className="size-5 animate-spin" aria-hidden />
          Loading local page previews…
        </div>
      )}
      {loadError && (
        <p className="mt-4 text-sm text-destructive">{loadError}</p>
      )}

      {pdfBytes && thumbnails.length > 0 && (
        <div className="mt-6 space-y-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <section className="rounded-lg border bg-muted/20 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">
                    Page {activePage + 1} of {pageCount}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Drag over every area that must be permanently hidden.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!boxes.length || working}
                    onClick={() => {
                      setBoxes((current) => current.slice(0, -1));
                      invalidate();
                    }}
                  >
                    <RiArrowGoBackLine data-icon="inline-start" />
                    Undo
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!currentBoxes.length || working}
                    onClick={() => {
                      setBoxes((current) =>
                        current.filter((box) => box.pageIndex !== activePage),
                      );
                      invalidate();
                    }}
                  >
                    Clear page
                  </Button>
                </div>
              </div>

              <div className="flex min-h-80 items-center justify-center overflow-auto rounded-md bg-black/10 p-3">
                {preview ? (
                  <div
                    className="relative max-w-full cursor-crosshair touch-none select-none overflow-hidden bg-white shadow-md"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={finishDraft}
                    onPointerCancel={() => setDraft(null)}
                    aria-label={`Draw redactions on page ${activePage + 1}`}
                  >
                    <img
                      src={preview}
                      alt={`PDF page ${activePage + 1} redaction preview`}
                      className="max-h-[640px] max-w-full object-contain"
                      draggable={false}
                    />
                    {currentBoxes.map((box, index) => (
                      <div
                        key={`${box.x}-${box.y}-${index}`}
                        className="pointer-events-none absolute bg-black ring-1 ring-white/80"
                        style={redactionPreviewStyle(box)}
                      />
                    ))}
                    {draftBox && (
                      <div
                        className="pointer-events-none absolute bg-black/80 ring-2 ring-primary"
                        style={redactionPreviewStyle(draftBox)}
                      />
                    )}
                  </div>
                ) : (
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <RiLoader4Line className="size-4 animate-spin" />
                    Rendering page preview…
                  </div>
                )}
              </div>
            </section>

            <aside className="space-y-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium">Redaction areas</p>
                <p className="text-muted-foreground mt-1 text-2xl font-semibold tabular-nums">
                  {boxes.length}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Across {new Set(boxes.map((box) => box.pageIndex)).size} pages
                </p>
                {boxes.length > 0 && (
                  <Button
                    className="mt-3 w-full"
                    size="sm"
                    variant="outline"
                    disabled={working}
                    onClick={() => {
                      setBoxes([]);
                      invalidate();
                    }}
                  >
                    <RiDeleteBin6Line data-icon="inline-start" />
                    Clear all areas
                  </Button>
                )}
              </div>

              <fieldset className="rounded-lg border p-4">
                <legend className="px-1 text-sm font-medium">
                  Precise area
                </legend>
                <p className="text-muted-foreground mb-3 text-xs">
                  Enter percentages from the page’s top-left corner.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(["left", "top", "width", "height"] as const).map((key) => (
                    <Label key={key} className="text-xs capitalize">
                      {key} %
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={preciseArea[key]}
                        disabled={working}
                        className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm tabular-nums"
                        onChange={(event) =>
                          setPreciseArea((current) => ({
                            ...current,
                            [key]: event.target.valueAsNumber,
                          }))
                        }
                      />
                    </Label>
                  ))}
                </div>
                <Button
                  className="mt-3 w-full"
                  size="sm"
                  variant="outline"
                  disabled={working || !preciseAreaValid}
                  onClick={() => {
                    setBoxes((current) => [
                      ...current,
                      redactionBoxFromPercentages(
                        activePage,
                        preciseArea.left,
                        preciseArea.top,
                        preciseArea.width,
                        preciseArea.height,
                      ),
                    ]);
                    invalidate();
                  }}
                >
                  Add precise area
                </Button>
              </fieldset>

              <fieldset className="rounded-lg border p-4">
                <legend className="px-1 text-sm font-medium">
                  Output quality
                </legend>
                <div className="space-y-2">
                  {Object.entries(REDACTION_QUALITY).map(
                    ([value, settings]) => (
                      <button
                        key={value}
                        type="button"
                        className={`w-full rounded-md border p-3 text-left ${
                          quality === value
                            ? "border-primary bg-primary/5"
                            : "hover:border-foreground/20"
                        }`}
                        aria-pressed={quality === value}
                        disabled={working}
                        onClick={() => {
                          setQuality(value as RedactionQuality);
                          invalidate();
                        }}
                      >
                        <span className="block text-sm font-medium">
                          {settings.label}
                        </span>
                        <span className="text-muted-foreground mt-1 block text-xs">
                          {settings.description}
                        </span>
                      </button>
                    ),
                  )}
                </div>
              </fieldset>
            </aside>
          </div>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">Pages</p>
              <p className="text-muted-foreground text-xs">
                Select a page to mark
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9">
              {thumbnails.map((thumbnail, index) => {
                const count = redactionsOnPage(boxes, index).length;
                return (
                  <button
                    key={index}
                    type="button"
                    className={`relative rounded-lg border-2 p-1 transition-colors ${
                      activePage === index
                        ? "border-primary"
                        : "border-border hover:border-foreground/30"
                    }`}
                    onClick={() => setActivePage(index)}
                    aria-pressed={activePage === index}
                    aria-label={`Edit page ${index + 1}${count ? `, ${count} redaction areas` : ""}`}
                  >
                    <img
                      src={thumbnail}
                      alt=""
                      className="max-h-32 w-full object-contain"
                    />
                    <span className="text-muted-foreground block py-1 text-xs">
                      {index + 1}
                    </span>
                    {count > 0 && (
                      <span className="absolute right-1 top-1 rounded-full bg-black px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {working && (
            <output className="block rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <RiLoader4Line className="size-4 animate-spin" />
                {stage === "verifying"
                  ? "Verifying hidden structures are absent…"
                  : `Rendering and redacting page ${Math.min(completed + 1, pageCount)} of ${pageCount}…`}
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{
                    width: `${stage === "verifying" ? 100 : pageCount ? (completed / pageCount) * 92 : 0}%`,
                  }}
                />
              </div>
            </output>
          )}

          {result && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <div className="flex items-start gap-3">
                <RiShieldCheckLine
                  className="mt-0.5 size-5 text-emerald-500"
                  aria-hidden
                />
                <div>
                  <p className="font-medium">
                    Redacted structure verification passed
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {boxes.length} areas burned into {pageCount} flattened pages
                    · {formatBytes(result.byteLength)}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  const base = (fileName ?? "document").replace(/\.pdf$/i, "");
                  downloadPdfBytes(result, `${base}-redacted.pdf`);
                }}
              >
                <RiDownload2Line data-icon="inline-start" />
                Download redacted PDF
              </Button>
            </div>
          )}

          {saveError && <p className="text-sm text-destructive">{saveError}</p>}

          <div className="rounded-lg border p-4">
            <div className="flex items-start gap-3">
              <input
                id="redaction-acknowledgement"
                type="checkbox"
                className="mt-0.5 size-4 shrink-0 accent-primary"
                checked={acknowledged}
                disabled={working}
                onChange={(event) => setAcknowledged(event.target.checked)}
              />
              <Label
                htmlFor="redaction-acknowledgement"
                className="font-normal leading-5"
              >
                I understand that every page will be rasterised and editable or
                interactive PDF features will be permanently removed.
              </Label>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={handleReset} disabled={working}>
              Remove PDF
            </Button>
            {working ? (
              <Button
                variant="outline"
                onClick={() => abortRef.current?.abort()}
              >
                Cancel redaction
              </Button>
            ) : (
              <Button
                onClick={handleRedact}
                disabled={!boxes.length || !acknowledged}
              >
                <RiShieldCheckLine data-icon="inline-start" />
                Flatten & permanently redact
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
