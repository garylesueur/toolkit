"use client";

import {
  RiCloseLine,
  RiDownload2Line,
  RiRefreshLine,
  RiUploadCloud2Line,
} from "@remixicon/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Point2D, Quad } from "@/lib/perspective-mockup/types";
import { renderPerspectiveImage } from "@/lib/perspective-mockup/transform";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const HANDLE_RADIUS = 8;
const HIT_RADIUS = 18;
const PREVIEW_SUBDIVISIONS = 16;
const EXPORT_SUBDIVISIONS = 32;
const MAX_CANVAS_HEIGHT = 650;

const HANDLE_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308"];
const CORNER_LABELS = ["TL", "TR", "BR", "BL"];

const DEFAULT_CORNERS: Quad = [
  { x: 0.25, y: 0.25 },
  { x: 0.75, y: 0.25 },
  { x: 0.75, y: 0.75 },
  { x: 0.25, y: 0.75 },
];

type LoadedImage = {
  element: HTMLImageElement;
  url: string;
  name: string;
};

function loadImageFile(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ element: img, url, name: file.name });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export default function PerspectiveMockupPage() {
  const [primary, setPrimary] = useState<LoadedImage | null>(null);
  const [secondary, setSecondary] = useState<LoadedImage | null>(null);
  const [corners, setCorners] = useState<Quad>(DEFAULT_CORNERS);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOverPrimary, setDragOverPrimary] = useState(false);
  const [dragOverSecondary, setDragOverSecondary] = useState(false);
  const [containerWidth, setContainerWidth] = useState(900);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const primaryInputRef = useRef<HTMLInputElement>(null);
  const secondaryInputRef = useRef<HTMLInputElement>(null);

  // Track container width for responsive canvas sizing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Compute canvas display dimensions
  const canvasW =
    primary
      ? Math.round(
          primary.element.naturalWidth *
            Math.min(
              containerWidth / primary.element.naturalWidth,
              MAX_CANVAS_HEIGHT / primary.element.naturalHeight,
              1,
            ),
        )
      : 0;
  const canvasH =
    primary
      ? Math.round(
          primary.element.naturalHeight *
            Math.min(
              containerWidth / primary.element.naturalWidth,
              MAX_CANVAS_HEIGHT / primary.element.naturalHeight,
              1,
            ),
        )
      : 0;

  // --- Drawing ---

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !primary || canvasW === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvasW;
    canvas.height = canvasH;

    // Primary image
    ctx.drawImage(primary.element, 0, 0, canvasW, canvasH);

    // Convert normalised corners to pixel coords
    const px: Quad = corners.map((c) => ({
      x: c.x * canvasW,
      y: c.y * canvasH,
    })) as Quad;

    // Perspective-mapped secondary image
    if (secondary) {
      renderPerspectiveImage(ctx, secondary.element, px, PREVIEW_SUBDIVISIONS);
    } else {
      // Show placeholder fill
      ctx.fillStyle = "rgba(59, 130, 246, 0.12)";
      ctx.beginPath();
      ctx.moveTo(px[0].x, px[0].y);
      for (let i = 1; i < 4; i++) ctx.lineTo(px[i].x, px[i].y);
      ctx.closePath();
      ctx.fill();
    }

    // Quad outline
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(px[0].x, px[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(px[i].x, px[i].y);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // Shadow outline for contrast on light backgrounds
    ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(px[0].x + 1, px[0].y + 1);
    for (let i = 1; i < 4; i++) ctx.lineTo(px[i].x + 1, px[i].y + 1);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // Corner handles
    for (let i = 0; i < 4; i++) {
      // Outer ring
      ctx.fillStyle = HANDLE_COLORS[i];
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(px[i].x, px[i].y, HANDLE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Label
      ctx.fillStyle = "white";
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(CORNER_LABELS[i], px[i].x, px[i].y);
    }
  }, [primary, secondary, corners, canvasW, canvasH]);

  // --- Pointer helpers ---

  const getNormalised = useCallback(
    (clientX: number, clientY: number): Point2D => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left) / rect.width,
        y: (clientY - rect.top) / rect.height,
      };
    },
    [],
  );

  const findHandle = useCallback(
    (clientX: number, clientY: number): number | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();

      for (let i = 0; i < 4; i++) {
        const hx = rect.left + corners[i].x * rect.width;
        const hy = rect.top + corners[i].y * rect.height;
        if (Math.hypot(clientX - hx, clientY - hy) < HIT_RADIUS) return i;
      }
      return null;
    },
    [corners],
  );

  // --- Mouse events ---

  const handlePointerDown = useCallback(
    (clientX: number, clientY: number) => {
      const idx = findHandle(clientX, clientY);
      if (idx !== null) setDragging(idx);
    },
    [findHandle],
  );

  const handlePointerMove = useCallback(
    (clientX: number, clientY: number) => {
      if (dragging === null) return;
      const pos = getNormalised(clientX, clientY);
      setCorners((prev) => {
        const next = [...prev] as Quad;
        next[dragging] = { x: clamp(pos.x, 0, 1), y: clamp(pos.y, 0, 1) };
        return next;
      });
    },
    [dragging, getNormalised],
  );

  const handlePointerUp = useCallback(() => setDragging(null), []);

  // Release drag if pointer leaves the window
  useEffect(() => {
    if (dragging === null) return;
    const up = () => setDragging(null);
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, [dragging]);

  // --- Upload handlers ---

  const handleFile = useCallback(
    async (file: File, target: "primary" | "secondary") => {
      if (!ACCEPTED_TYPES.includes(file.type)) return;
      try {
        const loaded = await loadImageFile(file);
        if (target === "primary") {
          if (primary) URL.revokeObjectURL(primary.url);
          setPrimary(loaded);
        } else {
          if (secondary) URL.revokeObjectURL(secondary.url);
          setSecondary(loaded);
        }
      } catch {
        // silently ignore broken images
      }
    },
    [primary, secondary],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, target: "primary" | "secondary") => {
      const file = e.target.files?.[0];
      if (file) handleFile(file, target);
      e.target.value = "";
    },
    [handleFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, target: "primary" | "secondary") => {
      e.preventDefault();
      if (target === "primary") setDragOverPrimary(false);
      else setDragOverSecondary(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file, target);
    },
    [handleFile],
  );

  const removePrimary = useCallback(() => {
    if (primary) URL.revokeObjectURL(primary.url);
    setPrimary(null);
    setCorners(DEFAULT_CORNERS);
  }, [primary]);

  const removeSecondary = useCallback(() => {
    if (secondary) URL.revokeObjectURL(secondary.url);
    setSecondary(null);
  }, [secondary]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (primary) URL.revokeObjectURL(primary.url);
      if (secondary) URL.revokeObjectURL(secondary.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Export ---

  const handleExport = useCallback(() => {
    if (!primary || !secondary) return;

    const pw = primary.element.naturalWidth;
    const ph = primary.element.naturalHeight;

    const offscreen = document.createElement("canvas");
    offscreen.width = pw;
    offscreen.height = ph;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(primary.element, 0, 0);

    const fullCorners: Quad = corners.map((c) => ({
      x: c.x * pw,
      y: c.y * ph,
    })) as Quad;

    renderPerspectiveImage(ctx, secondary.element, fullCorners, EXPORT_SUBDIVISIONS);

    offscreen.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "perspective-mockup.png";
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, [primary, secondary, corners]);

  // --- Render ---

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Perspective Mockup</h1>
        <p className="text-muted-foreground mt-1">
          Place an image onto any surface with realistic 3D perspective. Upload a
          background photo, then map a second image onto a four-point quad.
        </p>
      </div>

      {/* Upload zones */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Primary */}
        <div className="space-y-1.5">
          <Label>Background Image</Label>
          {primary ? (
            <div className="relative rounded-lg border bg-muted/30 p-2">
              <img
                src={primary.url}
                alt="Primary"
                className="h-28 w-full rounded object-contain"
              />
              <p className="text-muted-foreground mt-1 truncate text-xs">
                {primary.name}
              </p>
              <button
                type="button"
                onClick={removePrimary}
                className="bg-background/80 hover:bg-background absolute top-1 right-1 rounded-full p-0.5"
                aria-label="Remove background image"
              >
                <RiCloseLine className="size-4" />
              </button>
            </div>
          ) : (
            <div
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
                dragOverPrimary
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50",
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverPrimary(true);
              }}
              onDragLeave={() => setDragOverPrimary(false)}
              onDrop={(e) => handleDrop(e, "primary")}
              onClick={() => primaryInputRef.current?.click()}
            >
              <RiUploadCloud2Line className="text-muted-foreground mb-2 size-8" />
              <p className="text-muted-foreground text-sm">
                Drop image or click to upload
              </p>
              <input
                ref={primaryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleInputChange(e, "primary")}
              />
            </div>
          )}
        </div>

        {/* Secondary */}
        <div className="space-y-1.5">
          <Label>Overlay Image</Label>
          {secondary ? (
            <div className="relative rounded-lg border bg-muted/30 p-2">
              <img
                src={secondary.url}
                alt="Secondary"
                className="h-28 w-full rounded object-contain"
              />
              <p className="text-muted-foreground mt-1 truncate text-xs">
                {secondary.name}
              </p>
              <button
                type="button"
                onClick={removeSecondary}
                className="bg-background/80 hover:bg-background absolute top-1 right-1 rounded-full p-0.5"
                aria-label="Remove overlay image"
              >
                <RiCloseLine className="size-4" />
              </button>
            </div>
          ) : (
            <div
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
                dragOverSecondary
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50",
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverSecondary(true);
              }}
              onDragLeave={() => setDragOverSecondary(false)}
              onDrop={(e) => handleDrop(e, "secondary")}
              onClick={() => secondaryInputRef.current?.click()}
            >
              <RiUploadCloud2Line className="text-muted-foreground mb-2 size-8" />
              <p className="text-muted-foreground text-sm">
                Drop image or click to upload
              </p>
              <input
                ref={secondaryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleInputChange(e, "secondary")}
              />
            </div>
          )}
        </div>
      </div>

      {/* Canvas */}
      {primary && (
        <div ref={containerRef} className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Drag the corner handles to define the target surface.
          </p>
          <canvas
            ref={canvasRef}
            className="mx-auto block rounded-lg shadow-md"
            style={{
              cursor:
                dragging !== null
                  ? "grabbing"
                  : "crosshair",
              touchAction: "none",
            }}
            onPointerDown={(e) => handlePointerDown(e.clientX, e.clientY)}
            onPointerMove={(e) => handlePointerMove(e.clientX, e.clientY)}
            onPointerUp={handlePointerUp}
          />
        </div>
      )}

      {/* Actions */}
      {primary && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleExport} disabled={!secondary}>
            <RiDownload2Line className="mr-1.5 size-4" />
            Download
          </Button>
          <Button
            variant="outline"
            onClick={() => setCorners(DEFAULT_CORNERS)}
          >
            <RiRefreshLine className="mr-1.5 size-4" />
            Reset Points
          </Button>
        </div>
      )}
    </div>
  );
}
