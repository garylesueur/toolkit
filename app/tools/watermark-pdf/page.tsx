"use client";

import {
  RiCloseLine,
  RiDownload2Line,
  RiImageAddLine,
  RiLoader4Line,
  RiWaterPercentLine,
} from "@remixicon/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PageThumbnailGrid } from "@/components/pdf/page-thumbnail-grid";
import { PdfDropZone } from "@/components/pdf/pdf-drop-zone";
import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePdfDocument } from "@/hooks/use-pdf-document";
import { downloadPdfBytes } from "@/lib/pdf/download";
import { parsePageRanges } from "@/lib/pdf/page-ranges";
import { watermarkPdf } from "@/lib/pdf/watermark";
import type {
  WatermarkLayer,
  WatermarkPosition,
} from "@/lib/pdf/watermark-options";

const POSITIONS: Array<{ label: string; value: WatermarkPosition }> = [
  { label: "Centre", value: "center" },
  { label: "Top left", value: "top-left" },
  { label: "Top centre", value: "top-center" },
  { label: "Top right", value: "top-right" },
  { label: "Middle left", value: "middle-left" },
  { label: "Middle right", value: "middle-right" },
  { label: "Bottom left", value: "bottom-left" },
  { label: "Bottom centre", value: "bottom-center" },
  { label: "Bottom right", value: "bottom-right" },
];

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function WatermarkPdfPage() {
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
  const [kind, setKind] = useState<"text" | "image">("text");
  const [text, setText] = useState("DRAFT");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(52);
  const [widthPercent, setWidthPercent] = useState(35);
  const [opacity, setOpacity] = useState(0.25);
  const [rotation, setRotation] = useState(-45);
  const [position, setPosition] = useState<WatermarkPosition>("center");
  const [layer, setLayer] = useState<WatermarkLayer>("foreground");
  const [margin, setMargin] = useState(28);
  const [colour, setColour] = useState<"dark" | "light">("dark");
  const [rangeInput, setRangeInput] = useState("");
  const [working, setWorking] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const range = useMemo(
    () => parsePageRanges(rangeInput, pageCount),
    [pageCount, rangeInput],
  );
  const targetCount = range.pages.length || pageCount;

  useEffect(
    () => () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    },
    [imagePreview],
  );
  const invalidate = useCallback(() => {
    setResult(null);
    setSaveError(null);
  }, []);

  const handleWatermark = useCallback(async () => {
    if (
      !pdfBytes ||
      range.error ||
      (kind === "text" ? !text.trim() : !imageFile)
    )
      return;
    setWorking(true);
    setCompleted(0);
    invalidate();
    try {
      const common = {
        layer,
        margin,
        opacity,
        pages: range.pages,
        position,
        rotation,
      };
      const options =
        kind === "text"
          ? {
              ...common,
              colour,
              fontSize,
              kind: "text" as const,
              text: text.trim(),
            }
          : {
              ...common,
              image: new Uint8Array(await imageFile!.arrayBuffer()),
              imageType:
                imageFile!.type === "image/png"
                  ? ("png" as const)
                  : ("jpeg" as const),
              kind: "image" as const,
              widthPercent,
            };
      setResult(
        await watermarkPdf(pdfBytes, options, (done) => setCompleted(done)),
      );
    } catch (failure) {
      setSaveError(
        failure instanceof Error
          ? failure.message
          : "Could not watermark this PDF.",
      );
    } finally {
      setWorking(false);
    }
  }, [
    colour,
    fontSize,
    imageFile,
    invalidate,
    kind,
    layer,
    margin,
    opacity,
    pdfBytes,
    position,
    range,
    rotation,
    text,
    widthPercent,
  ]);

  const outputName = `${(fileName ?? "document").replace(/\.pdf$/i, "")}-watermarked.pdf`;
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Watermark PDF</h1>
      <p className="text-muted-foreground mt-1">
        Place a text or image watermark over or behind selected PDF pages.
      </p>
      <PrivacyBanner>
        Your PDF and watermark stay in your browser. Nothing is uploaded or sent
        to a server.
      </PrivacyBanner>
      <div className="mt-8">
        <PdfDropZone
          compact={!!pdfBytes}
          label={pdfBytes ? "Choose a different PDF" : undefined}
          onFiles={(files) => {
            invalidate();
            setRangeInput("");
            void loadFile(files[0]);
          }}
        />
      </div>
      {loading && (
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <RiLoader4Line className="size-5 animate-spin" />
          Loading and previewing PDF…
        </div>
      )}
      {loadError && (
        <p className="mt-4 text-sm text-destructive">{loadError}</p>
      )}
      {pdfBytes && thumbnails.length > 0 && (
        <div className="mt-6 space-y-6">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={kind === "text" ? "default" : "outline"}
              onClick={() => {
                setKind("text");
                invalidate();
              }}
            >
              Text watermark
            </Button>
            <Button
              size="sm"
              variant={kind === "image" ? "default" : "outline"}
              onClick={() => {
                setKind("image");
                invalidate();
              }}
            >
              Image watermark
            </Button>
          </div>
          <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-3">
            {kind === "text" ? (
              <>
                <div className="sm:col-span-2">
                  <Label htmlFor="watermark-text">Watermark text</Label>
                  <Input
                    id="watermark-text"
                    value={text}
                    maxLength={120}
                    onChange={(e) => {
                      setText(e.target.value);
                      invalidate();
                    }}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="watermark-font-size">Font size</Label>
                  <Input
                    id="watermark-font-size"
                    type="number"
                    min="8"
                    max="200"
                    value={fontSize}
                    onChange={(e) => {
                      setFontSize(
                        Math.min(200, Math.max(8, Number(e.target.value))),
                      );
                      invalidate();
                    }}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Text colour</Label>
                  <Select
                    value={colour}
                    onValueChange={(value) => {
                      setColour(value as "dark" | "light");
                      invalidate();
                    }}
                  >
                    <SelectTrigger className="mt-1.5 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="light">White</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div className="sm:col-span-2">
                <Label htmlFor="watermark-image">Watermark image</Label>
                <Input
                  id="watermark-image"
                  type="file"
                  accept="image/png,image/jpeg"
                  className="mt-1.5"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    if (imagePreview) URL.revokeObjectURL(imagePreview);
                    setImageFile(file);
                    setImagePreview(file ? URL.createObjectURL(file) : null);
                    invalidate();
                  }}
                />
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Watermark preview"
                    className="mt-3 max-h-24 rounded border object-contain"
                  />
                )}
              </div>
            )}
            {kind === "image" && (
              <div>
                <Label htmlFor="watermark-width">Width · {widthPercent}%</Label>
                <input
                  id="watermark-width"
                  type="range"
                  min="5"
                  max="100"
                  value={widthPercent}
                  onChange={(e) => {
                    setWidthPercent(Number(e.target.value));
                    invalidate();
                  }}
                  className="mt-3 w-full accent-primary"
                />
              </div>
            )}
            <div>
              <Label htmlFor="watermark-opacity">
                Opacity · {Math.round(opacity * 100)}%
              </Label>
              <input
                id="watermark-opacity"
                type="range"
                min="0.05"
                max="1"
                step="0.05"
                value={opacity}
                onChange={(e) => {
                  setOpacity(Number(e.target.value));
                  invalidate();
                }}
                className="mt-3 w-full accent-primary"
              />
            </div>
            <div>
              <Label>Rotation</Label>
              <Select
                value={String(rotation)}
                onValueChange={(value) => {
                  setRotation(Number(value));
                  invalidate();
                }}
              >
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[-90, -45, 0, 45, 90].map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value}°
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Position</Label>
              <Select
                value={position}
                onValueChange={(value) => {
                  setPosition(value as WatermarkPosition);
                  invalidate();
                }}
              >
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Layer</Label>
              <Select
                value={layer}
                onValueChange={(value) => {
                  setLayer(value as WatermarkLayer);
                  invalidate();
                }}
              >
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="foreground">Over page content</SelectItem>
                  <SelectItem value="background">
                    Behind page content
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="watermark-margin">Edge margin</Label>
              <Input
                id="watermark-margin"
                type="number"
                min="0"
                max="200"
                value={margin}
                onChange={(e) => {
                  setMargin(Math.min(200, Math.max(0, Number(e.target.value))));
                  invalidate();
                }}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="watermark-pages">Pages</Label>
              <Input
                id="watermark-pages"
                value={rangeInput}
                onChange={(e) => {
                  setRangeInput(e.target.value);
                  invalidate();
                }}
                placeholder={`All, or 1-3, ${pageCount}`}
                className="mt-1.5"
              />
              {range.error && (
                <p className="mt-1 text-xs text-destructive">{range.error}</p>
              )}
            </div>
          </div>
          <PageThumbnailGrid thumbnails={thumbnails} />
          {working && (
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <RiLoader4Line className="size-4 animate-spin" />
                Watermarking page {Math.min(completed + 1, targetCount)} of{" "}
                {targetCount}…
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{
                    width: `${targetCount ? (completed / targetCount) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          )}
          {saveError && <p className="text-sm text-destructive">{saveError}</p>}
          {result && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div>
                <p className="font-medium">Your watermarked PDF is ready</p>
                <p className="text-sm text-muted-foreground">
                  {targetCount} page{targetCount === 1 ? "" : "s"} ·{" "}
                  {formatBytes(result.byteLength)}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => downloadPdfBytes(result, outputName)}
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
                reset();
                invalidate();
              }}
            >
              <RiCloseLine data-icon="inline-start" />
              Remove PDF
            </Button>
            <Button
              disabled={
                working ||
                !!range.error ||
                (kind === "text" ? !text.trim() : !imageFile)
              }
              onClick={() => void handleWatermark()}
            >
              {working ? (
                <RiLoader4Line
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : kind === "image" ? (
                <RiImageAddLine data-icon="inline-start" />
              ) : (
                <RiWaterPercentLine data-icon="inline-start" />
              )}
              {working ? "Watermarking…" : "Apply watermark"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
