"use client";

import {
  RiCrop2Line,
  RiDownload2Line,
  RiImageAddLine,
  RiLoader4Line,
} from "@remixicon/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBytes } from "@/lib/image-compressor/compress";
import {
  browserSupportsImageFormat,
  createImageEditPlan,
  editImage,
  formatSupportsQuality,
  type CropPreset,
  type ImageEditFormat,
} from "@/lib/image-editor/edit";

const CROP_PRESETS: { value: CropPreset; label: string }[] = [
  { value: "original", label: "Original" },
  { value: "1:1", label: "Square 1:1" },
  { value: "4:3", label: "Landscape 4:3" },
  { value: "3:2", label: "Photo 3:2" },
  { value: "16:9", label: "Widescreen 16:9" },
];

const FORMATS: { value: ImageEditFormat; label: string }[] = [
  { value: "image/png", label: "PNG" },
  { value: "image/jpeg", label: "JPEG" },
  { value: "image/webp", label: "WebP" },
  { value: "image/avif", label: "AVIF" },
];

type LoadedImage = {
  file: File;
  url: string;
  width: number;
  height: number;
};

type EditedImage = {
  blob: Blob;
  url: string;
  fileName: string;
  width: number;
  height: number;
};

function boundedNumber(value: string, minimum: number, maximum: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return minimum;
  return Math.min(maximum, Math.max(minimum, Math.round(parsed)));
}

export default function ImageEditorPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const sourceUrlRef = useRef<string | null>(null);
  const resultUrlRef = useRef<string | null>(null);
  const [source, setSource] = useState<LoadedImage | null>(null);
  const [result, setResult] = useState<EditedImage | null>(null);
  const [cropPreset, setCropPreset] = useState<CropPreset>("original");
  const [focalX, setFocalX] = useState(50);
  const [focalY, setFocalY] = useState(50);
  const [outputWidth, setOutputWidth] = useState(1200);
  const [format, setFormat] = useState<ImageEditFormat>("image/webp");
  const [quality, setQuality] = useState(85);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avifSupported, setAvifSupported] = useState(false);

  useEffect(
    () => setAvifSupported(browserSupportsImageFormat("image/avif")),
    [],
  );

  useEffect(
    () => () => {
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    },
    [],
  );

  const plan = useMemo(() => {
    if (!source) return null;
    try {
      return createImageEditPlan(source.width, source.height, {
        cropPreset,
        focalX: focalX / 100,
        focalY: focalY / 100,
        outputWidth,
      });
    } catch {
      return null;
    }
  }, [cropPreset, focalX, focalY, outputWidth, source]);

  async function loadFile(file: File) {
    setError(null);
    const bitmap = await createImageBitmap(file);
    const width = bitmap.width;
    const height = bitmap.height;
    bitmap.close();
    const url = URL.createObjectURL(file);
    if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
    sourceUrlRef.current = url;
    setSource({ file, url, width, height });
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    resultUrlRef.current = null;
    setResult(null);
    setOutputWidth(Math.min(width, 1600));
    setCropPreset("original");
  }

  async function processImage() {
    if (!source) return;
    setWorking(true);
    setError(null);
    try {
      const edited = await editImage(source.file, {
        cropPreset,
        focalX: focalX / 100,
        focalY: focalY / 100,
        outputWidth,
        format,
        quality: quality / 100,
      });
      const url = URL.createObjectURL(edited.blob);
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = url;
      setResult({
        blob: edited.blob,
        url,
        fileName: edited.fileName,
        width: edited.plan.outputWidth,
        height: edited.plan.outputHeight,
      });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Image conversion failed",
      );
    } finally {
      setWorking(false);
    }
  }

  function downloadResult() {
    if (!result) return;
    const anchor = document.createElement("a");
    anchor.href = result.url;
    anchor.download = result.fileName;
    anchor.click();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        Image Resize, Crop & Convert
      </h1>
      <p className="text-muted-foreground mt-1">
        Crop to a useful aspect ratio, resize precisely, and export a modern
        format.
      </p>
      <PrivacyBanner>
        Your image is decoded, edited, and re-encoded entirely in this browser.
        Nothing is uploaded.
      </PrivacyBanner>

      {!source ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-8 flex min-h-64 w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed hover:border-primary/60"
        >
          <RiImageAddLine className="text-muted-foreground size-10" />
          <span className="font-medium">Choose an image</span>
          <span className="text-muted-foreground text-sm">
            JPEG, PNG, WebP, GIF, or AVIF where supported
          </span>
        </button>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(300px,0.9fr)_minmax(0,1.1fr)]">
          <section className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="crop-preset">Crop ratio</Label>
              <select
                id="crop-preset"
                value={cropPreset}
                onChange={(event) =>
                  setCropPreset(event.target.value as CropPreset)
                }
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              >
                {CROP_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>

            {cropPreset !== "original" && (
              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm font-medium">
                  Horizontal focus: {focalX}%
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={focalX}
                    onChange={(event) => setFocalX(Number(event.target.value))}
                    className="mt-2 w-full accent-primary"
                  />
                </label>
                <label className="text-sm font-medium">
                  Vertical focus: {focalY}%
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={focalY}
                    onChange={(event) => setFocalY(Number(event.target.value))}
                    className="mt-2 w-full accent-primary"
                  />
                </label>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="output-width">Output width</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="output-width"
                  type="number"
                  min={1}
                  max={16384}
                  value={outputWidth}
                  onChange={(event) =>
                    setOutputWidth(boundedNumber(event.target.value, 1, 16384))
                  }
                />
                <span className="text-muted-foreground whitespace-nowrap text-sm">
                  × {plan?.outputHeight ?? "—"} px
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image-format">Output format</Label>
              <select
                id="image-format"
                value={format}
                onChange={(event) =>
                  setFormat(event.target.value as ImageEditFormat)
                }
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              >
                {FORMATS.map((item) => (
                  <option
                    key={item.value}
                    value={item.value}
                    disabled={item.value === "image/avif" && !avifSupported}
                  >
                    {item.label}
                    {item.value === "image/avif" && !avifSupported
                      ? " (not supported by this browser)"
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            {formatSupportsQuality(format) && (
              <label className="block text-sm font-medium">
                Quality: {quality}%
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={quality}
                  onChange={(event) => setQuality(Number(event.target.value))}
                  className="mt-2 w-full accent-primary"
                />
              </label>
            )}

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={processImage}
                disabled={working || !plan}
              >
                {working ? (
                  <RiLoader4Line className="animate-spin" />
                ) : (
                  <RiCrop2Line />
                )}
                {working ? "Processing…" : "Apply & convert"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => inputRef.current?.click()}
              >
                Choose another
              </Button>
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="font-semibold">Source</h2>
              <p className="text-muted-foreground text-sm">
                {source.width} × {source.height} px ·{" "}
                {formatBytes(source.file.size)}
              </p>
              <img
                src={source.url}
                alt="Source preview"
                className="mt-2 max-h-72 w-full rounded-xl border bg-checkerboard object-contain"
              />
            </div>
            {result && (
              <div>
                <h2 className="font-semibold">Result</h2>
                <p className="text-muted-foreground text-sm">
                  {result.width} × {result.height} px ·{" "}
                  {formatBytes(result.blob.size)}
                </p>
                <img
                  src={result.url}
                  alt="Edited result preview"
                  className="mt-2 max-h-72 w-full rounded-xl border bg-checkerboard object-contain"
                />
                <Button type="button" className="mt-3" onClick={downloadResult}>
                  <RiDownload2Line /> Download {result.fileName}
                </Button>
              </div>
            )}
          </section>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        aria-label="Image file"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) loadFile(file).catch((caught) => setError(String(caught)));
          event.target.value = "";
        }}
      />
    </div>
  );
}
