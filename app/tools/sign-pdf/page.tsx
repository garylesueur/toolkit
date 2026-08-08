"use client";

import {
  RiCloseLine,
  RiDownload2Line,
  RiFileEditLine,
  RiImageAddLine,
  RiLoader4Line,
} from "@remixicon/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { PageThumbnailGrid } from "@/components/pdf/page-thumbnail-grid";
import { PdfDropZone } from "@/components/pdf/pdf-drop-zone";
import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePdfDocument } from "@/hooks/use-pdf-document";
import { downloadPdfBytes } from "@/lib/pdf/download";
import { placeSignaturePdf } from "@/lib/pdf/signature";
import type { SignaturePosition } from "@/lib/pdf/signature-options";

type SignatureKind = "draw" | "text" | "upload";

const POSITIONS: Array<{ label: string; value: SignaturePosition }> = [
  { label: "Top left", value: "top-left" },
  { label: "Top centre", value: "top-center" },
  { label: "Top right", value: "top-right" },
  { label: "Middle left", value: "middle-left" },
  { label: "Centre", value: "center" },
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

function dataUrlBytes(dataUrl: string): Uint8Array {
  const binary = atob(dataUrl.split(",")[1]);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export default function SignPdfPage() {
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [kind, setKind] = useState<SignatureKind>("draw");
  const [typedName, setTypedName] = useState("");
  const [colour, setColour] = useState<"black" | "blue">("black");
  const [hasInk, setHasInk] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [position, setPosition] = useState<SignaturePosition>("bottom-right");
  const [widthPercent, setWidthPercent] = useState(30);
  const [margin, setMargin] = useState(24);
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  const clearDrawing = useCallback(() => {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    invalidate();
  }, [invalidate]);

  const canvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * canvas.width,
      y: ((event.clientY - bounds.top) / bounds.height) * canvas.height,
    };
  };

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    const context = event.currentTarget.getContext("2d");
    const point = canvasPoint(event);
    if (!context) return;
    context.beginPath();
    context.moveTo(point.x, point.y);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 6;
    context.strokeStyle = colour === "blue" ? "#0a2980" : "#141414";
  };

  const continueDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const point = canvasPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
    setHasInk(true);
    invalidate();
  };

  const stopDrawing = () => {
    drawingRef.current = false;
  };

  const handleSign = useCallback(async () => {
    if (!pdfBytes) return;
    setWorking(true);
    invalidate();
    try {
      const common = { margin, page, position, widthPercent };
      if (kind === "text") {
        setResult(
          await placeSignaturePdf(pdfBytes, {
            ...common,
            colour,
            kind: "text",
            text: typedName,
          }),
        );
      } else {
        let image: Uint8Array;
        let imageType: "jpeg" | "png";
        if (kind === "draw") {
          const canvas = canvasRef.current;
          if (!canvas || !hasInk) throw new Error("Draw a signature first.");
          image = dataUrlBytes(canvas.toDataURL("image/png"));
          imageType = "png";
        } else {
          if (!imageFile) throw new Error("Choose a signature image first.");
          image = new Uint8Array(await imageFile.arrayBuffer());
          imageType = imageFile.type === "image/png" ? "png" : "jpeg";
        }
        setResult(
          await placeSignaturePdf(pdfBytes, {
            ...common,
            image,
            imageType,
            kind: "image",
          }),
        );
      }
    } catch (failure) {
      setSaveError(
        failure instanceof Error
          ? failure.message
          : "Could not place this signature.",
      );
    } finally {
      setWorking(false);
    }
  }, [
    colour,
    hasInk,
    imageFile,
    invalidate,
    kind,
    margin,
    page,
    pdfBytes,
    position,
    typedName,
    widthPercent,
  ]);

  const canSign =
    !!pdfBytes &&
    (kind === "text"
      ? !!typedName.trim()
      : kind === "draw"
        ? hasInk
        : !!imageFile);
  const outputName = `${(fileName ?? "document").replace(/\.pdf$/i, "")}-signed.pdf`;

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Sign PDF</h1>
      <p className="mt-1 text-muted-foreground">
        Draw, type, or upload a signature and place it on one PDF page.
      </p>
      <PrivacyBanner>
        Your PDF and signature stay in your browser. Nothing is uploaded or sent
        to a server.
      </PrivacyBanner>
      <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        This places a visible signature image. It does not create a
        certificate-backed digital signature, verify identity, or prove that the
        document has not changed.
      </div>
      <div className="mt-8">
        <PdfDropZone
          compact={!!pdfBytes}
          label={pdfBytes ? "Choose a different PDF" : undefined}
          onFiles={(files) => {
            invalidate();
            setPage(0);
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
          <div className="flex flex-wrap gap-2">
            {(["draw", "text", "upload"] as const).map((option) => (
              <Button
                key={option}
                size="sm"
                variant={kind === option ? "default" : "outline"}
                onClick={() => {
                  setKind(option);
                  invalidate();
                }}
              >
                {option === "draw"
                  ? "Draw signature"
                  : option === "text"
                    ? "Type signature"
                    : "Upload image"}
              </Button>
            ))}
          </div>

          <div className="rounded-lg border p-4">
            {kind === "draw" && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label>Draw with your mouse, pen, or finger</Label>
                  <Button size="sm" variant="ghost" onClick={clearDrawing}>
                    Clear
                  </Button>
                </div>
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={200}
                  aria-label="Signature drawing area"
                  className="h-40 w-full touch-none rounded-md border bg-white"
                  onPointerDown={startDrawing}
                  onPointerMove={continueDrawing}
                  onPointerUp={stopDrawing}
                  onPointerCancel={stopDrawing}
                />
              </div>
            )}
            {kind === "text" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="typed-signature">
                    Name or signature text
                  </Label>
                  <Input
                    id="typed-signature"
                    className="mt-1.5"
                    placeholder="Ada Lovelace"
                    value={typedName}
                    onChange={(event) => {
                      setTypedName(event.target.value);
                      invalidate();
                    }}
                  />
                </div>
                <div
                  className="flex min-h-20 items-center justify-center rounded-md border bg-white px-4 text-3xl italic text-zinc-900"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  {typedName || "Your signature"}
                </div>
              </div>
            )}
            {kind === "upload" && (
              <div>
                <Label
                  htmlFor="signature-image"
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed p-6 text-sm"
                >
                  <RiImageAddLine className="size-5" />
                  {imageFile
                    ? imageFile.name
                    : "Choose a PNG or JPEG signature"}
                </Label>
                <input
                  id="signature-image"
                  type="file"
                  accept="image/png,image/jpeg"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (imagePreview) URL.revokeObjectURL(imagePreview);
                    setImageFile(file);
                    setImagePreview(file ? URL.createObjectURL(file) : null);
                    invalidate();
                  }}
                />
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Signature preview"
                    className="mx-auto mt-3 max-h-28 rounded bg-white object-contain"
                  />
                )}
              </div>
            )}
          </div>

          <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="signature-colour">Ink colour</Label>
              <select
                id="signature-colour"
                value={colour}
                onChange={(event) => {
                  setColour(event.target.value as "black" | "blue");
                  invalidate();
                }}
                className="mt-1.5 h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="black">Black</option>
                <option value="blue">Blue</option>
              </select>
            </div>
            <div>
              <Label htmlFor="signature-width">Width ({widthPercent}%)</Label>
              <input
                id="signature-width"
                type="range"
                min={10}
                max={60}
                value={widthPercent}
                onChange={(event) => {
                  setWidthPercent(Number(event.target.value));
                  invalidate();
                }}
                className="mt-3 w-full accent-primary"
              />
            </div>
            <div>
              <Label htmlFor="signature-margin">Page margin (pt)</Label>
              <Input
                id="signature-margin"
                type="number"
                min={0}
                max={144}
                value={margin}
                onChange={(event) => {
                  setMargin(Number(event.target.value));
                  invalidate();
                }}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="signature-page">Page</Label>
              <select
                id="signature-page"
                value={page}
                onChange={(event) => {
                  setPage(Number(event.target.value));
                  invalidate();
                }}
                className="mt-1.5 h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                {Array.from({ length: pageCount }, (_, index) => (
                  <option key={index} value={index}>
                    Page {index + 1}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label>Position on page</Label>
            <div className="mt-2 grid max-w-lg grid-cols-3 gap-2">
              {POSITIONS.map((option) => (
                <Button
                  key={option.value}
                  size="sm"
                  variant={position === option.value ? "default" : "outline"}
                  onClick={() => {
                    setPosition(option.value);
                    invalidate();
                  }}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <PageThumbnailGrid
            thumbnails={thumbnails}
            selectedPages={new Set([page])}
            onTogglePage={(index) => {
              setPage(index);
              invalidate();
            }}
          />

          {saveError && <p className="text-sm text-destructive">{saveError}</p>}
          {result && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-green-500/30 bg-green-500/5 p-4">
              <div>
                <p className="font-medium">Your signed PDF is ready</p>
                <p className="text-sm text-muted-foreground">
                  Signature placed on page {page + 1} ·{" "}
                  {formatBytes(result.length)}
                </p>
              </div>
              <Button onClick={() => downloadPdfBytes(result, outputName)}>
                <RiDownload2Line className="size-4" />
                Download PDF
              </Button>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => {
                reset();
                setResult(null);
                setSaveError(null);
                setPage(0);
              }}
            >
              <RiCloseLine className="size-4" />
              Remove PDF
            </Button>
            <Button disabled={!canSign || working} onClick={handleSign}>
              {working ? (
                <RiLoader4Line className="size-4 animate-spin" />
              ) : (
                <RiFileEditLine className="size-4" />
              )}
              {working ? "Placing signature…" : "Place signature"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
