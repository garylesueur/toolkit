"use client";

import {
  RiCloseLine,
  RiDownload2Line,
  RiFileImageLine,
  RiLoader4Line,
} from "@remixicon/react";
import { downloadZip } from "client-zip";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PdfDropZone } from "@/components/pdf/pdf-drop-zone";
import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePdfDocument } from "@/hooks/use-pdf-document";
import {
  extractPdfImages,
  type ExtractedPdfImage,
  type PdfImageExtractionStage,
} from "@/lib/pdf/extract-images";
import {
  MAX_IMAGE_EXTRACTION_PAGES,
  resolveImageExtractionPages,
} from "@/lib/pdf/extract-images-options";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function baseName(fileName: string | null): string {
  return (fileName ?? "document").replace(/\.pdf$/i, "");
}

function imageBlob(image: ExtractedPdfImage): Blob {
  return new Blob([image.bytes.slice().buffer], { type: image.mimeType });
}

function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function stageDetails(stage: PdfImageExtractionStage | null): {
  label: string;
  percent: number;
} {
  if (stage === "extracting") {
    return { label: "Extracting original image streams…", percent: 68 };
  }
  if (stage === "collecting") {
    return { label: "Checking and collecting local image files…", percent: 94 };
  }
  return { label: "Loading the local PDF image engine…", percent: 18 };
}

function ExtractedImageCard({ image }: { image: ExtractedPdfImage }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!image.previewable) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageBlob(image));
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  return (
    <article className="overflow-hidden rounded-lg border">
      <div className="flex aspect-video items-center justify-center bg-muted/30">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={`Preview of ${image.name}`}
            className="size-full object-contain"
          />
        ) : (
          <div className="px-4 text-center text-sm text-muted-foreground">
            <RiFileImageLine className="mx-auto mb-2 size-7" aria-hidden />
            Preview unavailable for this native format
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 border-t p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={image.name}>
            {image.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {image.mimeType} · {formatBytes(image.size)}
          </p>
        </div>
        <Button
          size="icon-sm"
          variant="outline"
          aria-label={`Download ${image.name}`}
          onClick={() => downloadBlob(imageBlob(image), image.name)}
        >
          <RiDownload2Line aria-hidden />
        </Button>
      </div>
    </article>
  );
}

export default function ExtractPdfImagesPage() {
  const {
    pdfBytes,
    pageCount,
    fileName,
    loading,
    error: loadError,
    loadFile,
    reset,
  } = usePdfDocument({ renderThumbnails: false });
  const [pages, setPages] = useState("");
  const [working, setWorking] = useState(false);
  const [stage, setStage] = useState<PdfImageExtractionStage | null>(null);
  const [images, setImages] = useState<ExtractedPdfImage[]>([]);
  const [hasRun, setHasRun] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const range = useMemo(() => {
    if (!pageCount)
      return { pages: [] as number[], error: null as string | null };
    try {
      return {
        pages: resolveImageExtractionPages(pages, pageCount),
        error: null,
      };
    } catch (cause) {
      return {
        pages: [] as number[],
        error: cause instanceof Error ? cause.message : "Invalid page range.",
      };
    }
  }, [pageCount, pages]);

  const invalidate = useCallback(() => {
    setImages([]);
    setHasRun(false);
    setError(null);
  }, []);

  const handleReset = useCallback(() => {
    abortRef.current?.abort();
    reset();
    setPages("");
    setWorking(false);
    setStage(null);
    invalidate();
  }, [invalidate, reset]);

  const handleExtract = useCallback(async () => {
    if (!pdfBytes || range.error || !range.pages.length) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setWorking(true);
    setStage("loading-engine");
    setImages([]);
    setHasRun(false);
    setError(null);
    try {
      setImages(
        await extractPdfImages(pdfBytes, range.pages, {
          signal: controller.signal,
          onStage: setStage,
        }),
      );
      setHasRun(true);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") {
        setError("Image extraction cancelled.");
      } else {
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not extract images from this PDF.",
        );
      }
    } finally {
      abortRef.current = null;
      setWorking(false);
      setStage(null);
    }
  }, [pdfBytes, range]);

  const handleDownloadAll = useCallback(async () => {
    if (!images.length) return;
    if (images.length === 1) {
      downloadBlob(imageBlob(images[0]), images[0].name);
      return;
    }
    const zip = await downloadZip(
      images.map((image) => ({ name: image.name, input: imageBlob(image) })),
    ).blob();
    downloadBlob(zip, `${baseName(fileName)}-extracted-images.zip`);
  }, [fileName, images]);

  const progress = stageDetails(stage);
  const totalBytes = images.reduce((total, image) => total + image.size, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Extract PDF Images</h1>
      <p className="mt-1 text-muted-foreground">
        Recover original embedded raster images without rendering whole PDF
        pages.
      </p>
      <PrivacyBanner>
        Your PDF is processed by a disposable WebAssembly worker in this
        browser. The PDF and extracted images are never uploaded.
      </PrivacyBanner>

      <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-6">
        This extracts raster image objects, not page screenshots. Text, vectors,
        clipping, colour effects, and page layout are not included. Masks may be
        separate files, and some native TIFF, JP2, or JBIG2 images cannot be
        previewed by the browser but remain downloadable.
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

      {loading && (
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <RiLoader4Line className="size-5 animate-spin" aria-hidden />
          Loading and previewing PDF…
        </div>
      )}
      {loadError && (
        <p className="mt-4 text-sm text-destructive">{loadError}</p>
      )}

      {pdfBytes && pageCount > 0 && (
        <div className="mt-6 space-y-5">
          <div className="grid gap-4 rounded-lg border p-5 sm:grid-cols-2">
            <div>
              <p className="truncate text-sm font-medium">{fileName}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {pageCount} {pageCount === 1 ? "page" : "pages"} · maximum{" "}
                {MAX_IMAGE_EXTRACTION_PAGES} per run
              </p>
            </div>
            <div>
              <Label htmlFor="extract-image-pages">Pages</Label>
              <Input
                id="extract-image-pages"
                value={pages}
                disabled={working}
                placeholder={`All pages, or e.g. 1-${Math.min(pageCount, 5)}`}
                className="mt-1"
                onChange={(event) => {
                  setPages(event.target.value);
                  invalidate();
                }}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Leave blank for all pages, or use 1-3, 5.
              </p>
              {range.error && (
                <p className="mt-1 text-xs text-destructive">{range.error}</p>
              )}
            </div>
          </div>

          {working && (
            <output className="block overflow-hidden rounded-lg border bg-muted/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium">
                <span className="flex items-center gap-2">
                  <RiLoader4Line className="size-5 animate-spin text-primary" />
                  {progress.label}
                </span>
                <span className="tabular-nums">{progress.percent}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full animate-pulse rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => abortRef.current?.abort()}
                >
                  Cancel extraction
                </Button>
              </div>
            </output>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {hasRun && images.length === 0 && (
            <div className="rounded-lg border p-5 text-sm text-muted-foreground">
              No embedded raster images were found on the selected pages. The
              pages may contain only text and vector artwork.
            </div>
          )}

          {images.length > 0 && (
            <>
              <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-5">
                <div>
                  <p className="font-medium">Embedded images extracted</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {images.length} {images.length === 1 ? "image" : "images"} ·{" "}
                    {formatBytes(totalBytes)} total · original encoded formats
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => void handleDownloadAll()}
                >
                  <RiDownload2Line data-icon="inline-start" />
                  {images.length === 1 ? "Download image" : "Download ZIP"}
                </Button>
              </section>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {images.map((image) => (
                  <ExtractedImageCard
                    key={`${image.name}-${image.size}`}
                    image={image}
                  />
                ))}
              </div>
            </>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" disabled={working} onClick={handleReset}>
              <RiCloseLine data-icon="inline-start" />
              Remove PDF
            </Button>
            <Button
              disabled={working || !!range.error || !range.pages.length}
              onClick={() => void handleExtract()}
            >
              {working ? (
                <RiLoader4Line
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <RiFileImageLine data-icon="inline-start" />
              )}
              {working ? "Extracting…" : "Extract embedded images"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
