"use client";

import type { RotationAngle } from "@/lib/pdf/constants";

type PageThumbnailProps = {
  src: string;
  pageNumber: number;
  selected?: boolean;
  rotation?: RotationAngle;
  overlay?: React.ReactNode;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
};

export function PageThumbnail({
  src,
  pageNumber,
  selected = false,
  rotation = 0,
  overlay,
  onClick,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
}: PageThumbnailProps) {
  return (
    <div
      className={`relative cursor-pointer rounded-lg border-2 transition-colors ${
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-muted-foreground/40"
      }`}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex items-center justify-center overflow-hidden rounded-md p-2">
        <img
          src={src}
          alt={`Page ${pageNumber}`}
          className="max-h-48 w-full object-contain"
          style={{
            transform: rotation ? `rotate(${rotation}deg)` : undefined,
            transition: "transform 0.2s ease",
          }}
          draggable={false}
        />
      </div>
      <div className="text-muted-foreground bg-muted/50 rounded-b-md py-1 text-center text-xs font-medium">
        {pageNumber}
      </div>
      {overlay}
    </div>
  );
}
