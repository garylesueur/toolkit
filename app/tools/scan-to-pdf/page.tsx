"use client";

import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiCameraLine,
  RiCloseLine,
  RiDeleteBin6Line,
  RiDownload2Line,
  RiLoader4Line,
  RiRotateLockLine,
} from "@remixicon/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadImage } from "@/lib/image-compressor/compress";
import { downloadPdfBytes } from "@/lib/pdf/download";
import { processScan, scansToPdf } from "@/lib/pdf/scan";
import type { ScanSource } from "@/lib/pdf/scan";
import type { ScanCrop, ScanRotation } from "@/lib/pdf/scan-options";

type ScanItem = ScanSource & { file: File; id: string; previewUrl: string };
const EMPTY_CROP: ScanCrop = { top: 0, right: 0, bottom: 0, left: 0 };

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ScanToPdfPage() {
  const [items, setItems] = useState<ScanItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<ScanItem[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(
    () => () => {
      for (const item of itemsRef.current) URL.revokeObjectURL(item.previewUrl);
    },
    [],
  );
  const selected =
    items.find((item) => item.id === selectedId) ?? items[0] ?? null;
  const invalidate = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const addFiles = useCallback(
    async (files: File[]) => {
      const accepted = files.filter((file) =>
        ["image/jpeg", "image/png", "image/webp"].includes(file.type),
      );
      if (!accepted.length) {
        setError("Choose JPEG, PNG, or WebP images.");
        return;
      }
      const loaded: ScanItem[] = [];
      try {
        for (const file of accepted) {
          const { img, url } = await loadImage(file);
          loaded.push({
            file,
            image: img,
            previewUrl: url,
            id: crypto.randomUUID(),
            crop: { ...EMPTY_CROP },
            rotation: 0,
            grayscale: false,
            contrast: 110,
          });
        }
        setItems((current) => [...current, ...loaded]);
        setSelectedId((current) => current ?? loaded[0].id);
        invalidate();
      } catch {
        for (const item of loaded) URL.revokeObjectURL(item.previewUrl);
        setError("One of those images could not be read.");
      }
    },
    [invalidate],
  );

  const updateSelected = (change: Partial<ScanItem>) => {
    if (!selected) return;
    setItems((current) =>
      current.map((item) =>
        item.id === selected.id ? { ...item, ...change } : item,
      ),
    );
    invalidate();
  };
  const updateCrop = (side: keyof ScanCrop, value: number) => {
    if (!selected) return;
    updateSelected({
      crop: { ...selected.crop, [side]: Math.min(90, Math.max(0, value)) },
    });
  };
  const move = (index: number, direction: -1 | 1) => {
    setItems((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    invalidate();
  };
  const remove = (id: string) => {
    setItems((current) => {
      const removed = current.find((item) => item.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      const next = current.filter((item) => item.id !== id);
      setSelectedId((currentId) =>
        currentId === id ? (next[0]?.id ?? null) : currentId,
      );
      return next;
    });
    invalidate();
  };

  const createPdf = async () => {
    if (!items.length) return;
    setWorking(true);
    setCompleted(0);
    invalidate();
    try {
      const processed = [];
      for (let index = 0; index < items.length; index++) {
        processed.push(await processScan(items[index]));
        setCompleted(index + 1);
      }
      setResult(await scansToPdf(processed));
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not create the scan PDF.",
      );
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Scan to PDF</h1>
      <p className="text-muted-foreground mt-1">
        Capture or import pages, clean them up, and combine them into a PDF.
      </p>
      <PrivacyBanner>
        Your scans are processed entirely in your browser. Nothing is uploaded
        or sent to a server.
      </PrivacyBanner>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-8 flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors hover:border-muted-foreground/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <RiCameraLine className="size-8 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium">
          Take photos or choose page images
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          JPEG, PNG, or WebP · Multiple pages supported
        </p>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void addFiles(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      {items.length > 0 && (
        <div className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className={`overflow-hidden rounded-lg border transition-colors ${selected?.id === item.id ? "border-primary ring-1 ring-primary" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className="flex h-44 w-full items-center justify-center overflow-hidden bg-muted/30"
                  >
                    <img
                      src={item.previewUrl}
                      alt={`Scan page ${index + 1}`}
                      className="max-h-full max-w-full object-contain"
                      style={{
                        filter: `grayscale(${item.grayscale ? 1 : 0}) contrast(${item.contrast}%)`,
                        transform: `rotate(${item.rotation}deg)`,
                      }}
                    />
                  </button>
                  <div className="flex items-center gap-1 p-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {index + 1}. {item.file.name}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      aria-label="Move page earlier"
                    >
                      <RiArrowUpLine />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={index === items.length - 1}
                      onClick={() => move(index, 1)}
                      aria-label="Move page later"
                    >
                      <RiArrowDownLine />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => remove(item.id)}
                      aria-label="Remove page"
                    >
                      <RiDeleteBin6Line />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {selected && (
              <div className="space-y-4 rounded-lg border p-4">
                <p className="font-medium">Edit selected page</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateSelected({
                        rotation: ((selected.rotation + 90) %
                          360) as ScanRotation,
                      })
                    }
                  >
                    <RiRotateLockLine data-icon="inline-start" />
                    Rotate
                  </Button>
                  <Button
                    type="button"
                    variant={selected.grayscale ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      updateSelected({ grayscale: !selected.grayscale })
                    }
                  >
                    Grayscale
                  </Button>
                </div>
                <div>
                  <Label htmlFor="scan-contrast">
                    Contrast · {selected.contrast}%
                  </Label>
                  <input
                    id="scan-contrast"
                    type="range"
                    min="50"
                    max="200"
                    value={selected.contrast}
                    onChange={(e) =>
                      updateSelected({ contrast: Number(e.target.value) })
                    }
                    className="mt-3 w-full accent-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(["top", "right", "bottom", "left"] as const).map((side) => (
                    <div key={side}>
                      <Label htmlFor={`scan-crop-${side}`}>
                        {side[0].toUpperCase() + side.slice(1)} crop %
                      </Label>
                      <Input
                        id={`scan-crop-${side}`}
                        type="number"
                        min="0"
                        max="90"
                        value={selected.crop[side]}
                        onChange={(e) =>
                          updateCrop(side, Number(e.target.value))
                        }
                        className="mt-1"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Crop percentages apply to this page only.
                </p>
              </div>
            )}
          </div>
          {working && (
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <RiLoader4Line className="size-4 animate-spin" />
                Processing page {Math.min(completed + 1, items.length)} of{" "}
                {items.length}…
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${(completed / items.length) * 100}%` }}
                />
              </div>
            </div>
          )}
          {result && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div>
                <p className="font-medium">Your scanned PDF is ready</p>
                <p className="text-sm text-muted-foreground">
                  {items.length} page{items.length === 1 ? "" : "s"} ·{" "}
                  {formatBytes(result.byteLength)}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => downloadPdfBytes(result, "scanned-document.pdf")}
              >
                <RiDownload2Line data-icon="inline-start" />
                Download PDF
              </Button>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={working}
              onClick={() => {
                for (const item of items) URL.revokeObjectURL(item.previewUrl);
                setItems([]);
                setSelectedId(null);
                invalidate();
              }}
            >
              <RiCloseLine data-icon="inline-start" />
              Clear all
            </Button>
            <Button disabled={working} onClick={() => void createPdf()}>
              {working ? (
                <RiLoader4Line
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <RiCameraLine data-icon="inline-start" />
              )}
              {working ? "Creating PDF…" : "Create scanned PDF"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
