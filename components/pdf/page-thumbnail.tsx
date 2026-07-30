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
  const className = `relative rounded-lg border-2 transition-colors ${
    onClick ? "cursor-pointer" : ""
  } ${
    selected
      ? "border-primary bg-primary/5"
      : "border-border hover:border-muted-foreground/40"
  }`;

  const content = (
    <>
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
    </>
  );

  const dragProps = { draggable, onDragStart, onDragOver, onDrop };

  /**
   * Only an actionable thumbnail becomes a button. Display-only grids (resize)
   * would otherwise put an unusable stop in the tab order for every page.
   */
  if (!onClick) {
    return (
      <div className={className} {...dragProps}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`${className} w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`Page ${pageNumber}`}
      {...dragProps}
    >
      {content}
    </button>
  );
}
