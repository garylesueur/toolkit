"use client";

import {
  RiDownload2Line,
  RiRefreshLine,
  RiUploadCloud2Line,
} from "@remixicon/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ImageToolHandoff } from "@/components/image-tool-handoff";
import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  constrainCropPosition,
  getCropArea,
  type CropPosition,
} from "@/lib/image-editor/crop";
import {
  renderCroppedImage,
  type ImageOutputFormat,
} from "@/lib/image-editor/render";
import {
  clearImageHandoff,
  readImageHandoff,
} from "@/lib/tool-handoff/storage";
import { cn } from "@/lib/utils";

type SourceDetails = {
  filename: string;
  width: number;
  height: number;
};

type AspectPreset = "square" | "original" | "4:3" | "16:9" | "custom";

const MAX_OUTPUT_SIZE = 8192;
const FORMAT_EXTENSIONS: Record<ImageOutputFormat, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function initialPosition(width: number, height: number): CropPosition {
  return { centerX: width / 2, centerY: height / 2, zoom: 1 };
}

function safeBaseName(filename: string) {
  return filename.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9-_]+/g, "-");
}

export default function ImageCropResizePage() {
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [details, setDetails] = useState<SourceDetails | null>(null);
  const [position, setPosition] = useState<CropPosition | null>(null);
  const [aspectPreset, setAspectPreset] = useState<AspectPreset>("square");
  const [outputWidth, setOutputWidth] = useState(1024);
  const [outputHeight, setOutputHeight] = useState(1024);
  const [format, setFormat] = useState<ImageOutputFormat>("image/png");
  const [quality, setQuality] = useState(90);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceUrlRef = useRef<string | null>(null);
  const pointerRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    position: CropPosition;
  } | null>(null);

  const aspectRatio = outputWidth / outputHeight;

  const crop = useMemo(() => {
    if (!details || !position) return null;
    return getCropArea(position, details.width, details.height, aspectRatio);
  }, [aspectRatio, details, position]);

  const loadBlob = useCallback((blob: Blob, filename: string) => {
    if (!blob.type.startsWith("image/")) {
      setError("Choose an image file supported by your browser.");
      return;
    }

    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) {
        URL.revokeObjectURL(url);
        setError("That image has no usable dimensions.");
        return;
      }
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
      sourceUrlRef.current = url;
      setSourceUrl(url);
      setSource(image);
      setDetails({
        filename,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
      setPosition(initialPosition(image.naturalWidth, image.naturalHeight));
      setAspectPreset("square");
      setOutputWidth(1024);
      setOutputHeight(1024);
      setError(null);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      setError("That image could not be loaded by your browser.");
    };
    image.src = url;
  }, []);

  useEffect(() => {
    let cancelled = false;
    readImageHandoff()
      .then(async (handoff) => {
        if (!handoff || cancelled) return;
        loadBlob(handoff.blob, handoff.filename);
        await clearImageHandoff();
      })
      .catch(() => {
        if (!cancelled) setError("The image handoff could not be loaded.");
      });
    return () => {
      cancelled = true;
    };
  }, [loadBlob]);

  useEffect(
    () => () => {
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!source || !crop) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const previewWidth = 900;
    canvas.width = previewWidth;
    canvas.height = Math.max(1, Math.round(previewWidth / aspectRatio));
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      source,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
  }, [aspectRatio, crop, source]);

  const applyAspectPreset = useCallback(
    (preset: AspectPreset) => {
      if (!details) return;
      setAspectPreset(preset);
      if (preset === "square") {
        setOutputWidth(1024);
        setOutputHeight(1024);
      } else if (preset === "4:3") {
        setOutputWidth(1200);
        setOutputHeight(900);
      } else if (preset === "16:9") {
        setOutputWidth(1920);
        setOutputHeight(1080);
      } else {
        setOutputWidth(Math.min(MAX_OUTPUT_SIZE, details.width));
        setOutputHeight(Math.min(MAX_OUTPUT_SIZE, details.height));
      }
      setPosition(initialPosition(details.width, details.height));
    },
    [details],
  );

  const updateDimension = useCallback(
    (dimension: "width" | "height", value: number) => {
      const safeValue = Math.min(MAX_OUTPUT_SIZE, Math.max(1, value || 1));
      if (dimension === "width") setOutputWidth(safeValue);
      else setOutputHeight(safeValue);
      setAspectPreset("custom");
      if (details) setPosition(initialPosition(details.width, details.height));
    },
    [details],
  );

  const createOutput = useCallback(async () => {
    if (!source || !crop) throw new Error("Choose an image first.");
    return renderCroppedImage(
      source,
      crop,
      outputWidth,
      outputHeight,
      format,
      quality / 100,
    );
  }, [crop, format, outputHeight, outputWidth, quality, source]);

  const applyQuickSize = useCallback(
    (width: number) => {
      setOutputWidth(width);
      setOutputHeight(Math.max(1, Math.round(width / aspectRatio)));
    },
    [aspectRatio],
  );

  const outputFilename = useMemo(() => {
    const base = safeBaseName(details?.filename ?? "image") || "image";
    return `${base}-${outputWidth}x${outputHeight}.${FORMAT_EXTENSIONS[format]}`;
  }, [details, format, outputHeight, outputWidth]);

  const handleDownload = useCallback(async () => {
    setExporting(true);
    setError(null);
    try {
      const blob = await createOutput();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = outputFilename;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (exportError) {
      setError(
        exportError instanceof Error ? exportError.message : "Export failed.",
      );
    } finally {
      setExporting(false);
    }
  }, [createOutput, outputFilename]);

  const getOutputArtifact = useCallback(async () => {
    return {
      blob: await createOutput(),
      filename: outputFilename,
      sourceHref: "/tools/image-crop-resize",
    };
  }, [createOutput, outputFilename]);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const start = pointerRef.current;
      if (!start || !crop || !details) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      const next = {
        ...start.position,
        centerX:
          start.position.centerX -
          ((event.clientX - start.x) / bounds.width) * crop.width,
        centerY:
          start.position.centerY -
          ((event.clientY - start.y) / bounds.height) * crop.height,
      };
      setPosition(
        constrainCropPosition(next, details.width, details.height, aspectRatio),
      );
    },
    [aspectRatio, crop, details],
  );

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        Image Crop &amp; Resize
      </h1>
      <p className="text-muted-foreground mt-1 max-w-2xl">
        Quickly crop, reposition, and resize an image, then download it or pass
        it straight into another image tool.
      </p>
      <PrivacyBanner>
        Your image is edited entirely in your browser. Nothing is uploaded or
        stored.
      </PrivacyBanner>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          const file = event.dataTransfer.files[0];
          if (file) loadBlob(file, file.name);
        }}
        className={cn(
          "mt-8 flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground/40",
        )}
      >
        {sourceUrl && details ? (
          <div className="flex items-center gap-4">
            <img
              src={sourceUrl}
              alt="Source"
              className="size-16 rounded-lg object-contain"
            />
            <div className="text-left">
              <p className="text-sm font-medium">{details.filename}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {details.width}×{details.height} · click or drop to replace
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <RiUploadCloud2Line className="text-muted-foreground size-10" />
            <p className="text-sm font-medium">
              Drop any image here, or click to browse
            </p>
            <p className="text-muted-foreground text-xs">
              PNG, JPEG, WebP, GIF, SVG, or another browser-supported image
            </p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) loadBlob(file, file.name);
            event.target.value = "";
          }}
        />
      </button>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {source && details && position && (
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Crop</h2>
                <p className="text-muted-foreground text-sm">
                  Drag the image to position it inside the frame.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPosition(initialPosition(details.width, details.height))
                }
              >
                <RiRefreshLine data-icon="inline-start" aria-hidden />
                Reset crop
              </Button>
            </div>

            <div className="bg-muted overflow-hidden rounded-xl border p-3 sm:p-6">
              <canvas
                ref={canvasRef}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  pointerRef.current = {
                    pointerId: event.pointerId,
                    x: event.clientX,
                    y: event.clientY,
                    position,
                  };
                }}
                onPointerMove={handlePointerMove}
                onPointerUp={(event) => {
                  if (pointerRef.current?.pointerId === event.pointerId) {
                    pointerRef.current = null;
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }
                }}
                onPointerCancel={() => {
                  pointerRef.current = null;
                }}
                className="mx-auto block h-auto max-h-[640px] w-auto max-w-full cursor-grab touch-none rounded-lg bg-[repeating-conic-gradient(#e5e7eb_0_25%,#fff_0_50%)] bg-[length:20px_20px] shadow-sm active:cursor-grabbing dark:bg-[repeating-conic-gradient(#27272a_0_25%,#18181b_0_50%)]"
                style={{ aspectRatio }}
              >
                Crop preview. Drag to reposition the image.
              </canvas>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="crop-zoom">Zoom</Label>
                <span className="text-muted-foreground text-xs">
                  {position.zoom.toFixed(1)}×
                </span>
              </div>
              <input
                id="crop-zoom"
                type="range"
                min="1"
                max="5"
                step="0.05"
                value={position.zoom}
                onChange={(event) =>
                  setPosition(
                    constrainCropPosition(
                      { ...position, zoom: Number(event.target.value) },
                      details.width,
                      details.height,
                      aspectRatio,
                    ),
                  )
                }
                className="accent-primary w-full"
              />
            </div>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Output</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Shape</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    ["square", "original", "4:3", "16:9"] as AspectPreset[]
                  ).map((preset) => (
                    <Button
                      key={preset}
                      variant={aspectPreset === preset ? "default" : "outline"}
                      size="sm"
                      onClick={() => applyAspectPreset(preset)}
                    >
                      {preset === "square"
                        ? "Square"
                        : preset === "original"
                          ? "Original"
                          : preset}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="output-width">Width</Label>
                  <Input
                    id="output-width"
                    type="number"
                    min="1"
                    max={MAX_OUTPUT_SIZE}
                    value={outputWidth}
                    onChange={(event) =>
                      updateDimension("width", Number(event.target.value))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="output-height">Height</Label>
                  <Input
                    id="output-height"
                    type="number"
                    min="1"
                    max={MAX_OUTPUT_SIZE}
                    value={outputHeight}
                    onChange={(event) =>
                      updateDimension("height", Number(event.target.value))
                    }
                  />
                </div>
              </div>
              <p className="text-muted-foreground -mt-3 text-xs">
                Output is limited to {MAX_OUTPUT_SIZE}px per side.
              </p>

              <div className="space-y-2">
                <Label>Quick size</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[256, 512, 1024].map((size) => (
                    <Button
                      key={size}
                      variant="outline"
                      size="sm"
                      onClick={() => applyQuickSize(size)}
                    >
                      {size}px
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="output-format">Format</Label>
                <Select
                  value={format}
                  onValueChange={(value) =>
                    setFormat(value as ImageOutputFormat)
                  }
                >
                  <SelectTrigger id="output-format" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image/png">PNG</SelectItem>
                    <SelectItem value="image/jpeg">JPEG</SelectItem>
                    <SelectItem value="image/webp">WebP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {format !== "image/png" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="output-quality">Quality</Label>
                    <span className="text-muted-foreground text-xs">
                      {quality}%
                    </span>
                  </div>
                  <input
                    id="output-quality"
                    type="range"
                    min="20"
                    max="100"
                    value={quality}
                    onChange={(event) => setQuality(Number(event.target.value))}
                    className="accent-primary w-full"
                  />
                </div>
              )}

              <Button
                className="w-full"
                disabled={exporting}
                onClick={handleDownload}
              >
                <RiDownload2Line data-icon="inline-start" aria-hidden />
                {exporting
                  ? "Exporting…"
                  : `Download ${FORMAT_EXTENSIONS[format].toUpperCase()}`}
              </Button>
              <ImageToolHandoff
                getArtifact={getOutputArtifact}
                destinations={[
                  {
                    label: "App Icon Bundle",
                    href: "/tools/app-icon-bundle",
                  },
                  {
                    label: "Favicon Generator",
                    href: "/tools/favicon-generator",
                  },
                  {
                    label: "Chrome Extension Icons",
                    href: "/tools/chrome-extension-icons",
                  },
                ]}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
