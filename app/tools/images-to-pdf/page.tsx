"use client";

import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiDeleteBin6Line,
  RiDownload2Line,
  RiFilePdf2Line,
  RiLoader4Line,
  RiUploadCloud2Line,
} from "@remixicon/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { loadImage } from "@/lib/image-compressor/compress";
import { downloadPdfBytes } from "@/lib/pdf/download";
import { imagesToPdf } from "@/lib/pdf/from-images";
import type {
  ImagePageOrientation,
  ImagePageSize,
  PdfImageSource,
} from "@/lib/pdf/from-images";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MARGIN_OPTIONS = [0, 18, 36, 72] as const;

type ImageItem = PdfImageSource & {
  id: string;
  previewUrl: string;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImagesToPdfPage() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [pageSize, setPageSize] = useState<ImagePageSize>("image");
  const [orientation, setOrientation] = useState<ImagePageOrientation>("auto");
  const [margin, setMargin] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<ImageItem[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    return () => {
      for (const item of itemsRef.current) URL.revokeObjectURL(item.previewUrl);
    };
  }, []);

  const addFiles = useCallback(async (fileList: FileList) => {
    const files = Array.from(fileList).filter((file) =>
      ACCEPTED_IMAGE_TYPES.includes(file.type),
    );
    if (files.length === 0) {
      setError("Choose JPEG, PNG, or WebP images.");
      return;
    }

    const loaded: ImageItem[] = [];
    setError(null);
    setResult(null);

    try {
      for (const file of files) {
        const { img, url } = await loadImage(file);
        loaded.push({
          id: crypto.randomUUID(),
          file,
          image: img,
          previewUrl: url,
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      }
      setItems((current) => [...current, ...loaded]);
    } catch {
      for (const item of loaded) URL.revokeObjectURL(item.previewUrl);
      setError("One of those images could not be read by this browser.");
    }
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((current) => {
      const item = current.find((candidate) => candidate.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return current.filter((candidate) => candidate.id !== id);
    });
    setResult(null);
  }, []);

  const moveItem = useCallback((index: number, direction: -1 | 1) => {
    setItems((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setResult(null);
  }, []);

  const clearAll = useCallback(() => {
    setItems((current) => {
      for (const item of current) URL.revokeObjectURL(item.previewUrl);
      return [];
    });
    setResult(null);
    setError(null);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (items.length === 0) return;
    setGenerating(true);
    setProgress(0);
    setResult(null);
    setError(null);

    try {
      const bytes = await imagesToPdf(
        items,
        { pageSize, orientation, margin },
        (completed, total) => setProgress((completed / total) * 100),
      );
      setResult(bytes);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Could not create the PDF.",
      );
    } finally {
      setGenerating(false);
    }
  }, [items, margin, orientation, pageSize]);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Images to PDF</h1>
      <p className="text-muted-foreground mt-1">
        Combine JPEG, PNG, and WebP images into one ordered PDF.
      </p>
      <PrivacyBanner>
        Your images are assembled locally in your browser. Nothing is uploaded
        or stored on a server.
      </PrivacyBanner>

      <button
        type="button"
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          if (event.dataTransfer.files.length > 0)
            void addFiles(event.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`mt-8 flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground/40"
        }`}
      >
        <RiUploadCloud2Line
          className="text-muted-foreground size-8"
          aria-hidden
        />
        <p className="mt-2 text-sm font-medium">
          {items.length > 0
            ? "Drop more images, or click to browse"
            : "Drop images here, or click to browse"}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          JPEG, PNG, and WebP · Multiple files supported
        </p>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files) void addFiles(event.target.files);
          event.target.value = "";
        }}
      />

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {items.length > 0 && (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-3">
            <div>
              <Label>Page size</Label>
              <Select
                value={pageSize}
                onValueChange={(value) => {
                  setPageSize(value as ImagePageSize);
                  setResult(null);
                }}
              >
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Fit each image</SelectItem>
                  <SelectItem value="A4">A4</SelectItem>
                  <SelectItem value="Letter">US Letter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Orientation</Label>
              <Select
                value={orientation}
                disabled={pageSize === "image"}
                onValueChange={(value) => {
                  setOrientation(value as ImagePageOrientation);
                  setResult(null);
                }}
              >
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="portrait">Portrait</SelectItem>
                  <SelectItem value="landscape">Landscape</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Margin</Label>
              <Select
                value={String(margin)}
                onValueChange={(value) => {
                  setMargin(Number(value));
                  setResult(null);
                }}
              >
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MARGIN_OPTIONS.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value === 0 ? "None" : `${value} pt`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => (
              <div key={item.id} className="overflow-hidden rounded-lg border">
                <div className="flex h-40 items-center justify-center bg-muted/30 p-3">
                  <img
                    src={item.previewUrl}
                    alt={item.file.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="flex items-center gap-1 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {index + 1}. {item.file.name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {item.width}×{item.height} · {formatBytes(item.file.size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => moveItem(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${item.file.name} earlier`}
                  >
                    <RiArrowUpLine aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => moveItem(index, 1)}
                    disabled={index === items.length - 1}
                    aria-label={`Move ${item.file.name} later`}
                  >
                    <RiArrowDownLine aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.file.name}`}
                  >
                    <RiDeleteBin6Line aria-hidden />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {generating && (
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <RiLoader4Line className="size-4 animate-spin" aria-hidden />
                Creating page{" "}
                {Math.max(1, Math.ceil((progress / 100) * items.length))} of{" "}
                {items.length}…
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {result && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div>
                <p className="font-medium">Your PDF is ready</p>
                <p className="text-muted-foreground text-sm">
                  {items.length} page{items.length === 1 ? "" : "s"} ·{" "}
                  {formatBytes(result.byteLength)}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => downloadPdfBytes(result, "images.pdf")}
              >
                <RiDownload2Line data-icon="inline-start" />
                Download PDF
              </Button>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={clearAll} disabled={generating}>
              <RiDeleteBin6Line data-icon="inline-start" />
              Clear all
            </Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <RiLoader4Line
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <RiFilePdf2Line data-icon="inline-start" />
              )}
              {generating ? "Creating PDF…" : "Create PDF"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
