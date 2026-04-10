"use client"

import { PageThumbnail } from "./page-thumbnail"
import type { RotationAngle } from "@/lib/pdf/constants"

type PageThumbnailGridProps = {
  thumbnails: string[]
  selectedPages?: Set<number>
  rotations?: Map<number, RotationAngle>
  onTogglePage?: (index: number) => void
  overlay?: (index: number) => React.ReactNode
  /** Drag-and-drop reorder support */
  draggable?: boolean
  onDragStart?: (e: React.DragEvent, index: number) => void
  onDragOver?: (e: React.DragEvent, index: number) => void
  onDrop?: (e: React.DragEvent, index: number) => void
}

export function PageThumbnailGrid({
  thumbnails,
  selectedPages,
  rotations,
  onTogglePage,
  overlay,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
}: PageThumbnailGridProps) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {thumbnails.map((src, i) => (
        <PageThumbnail
          key={i}
          src={src}
          pageNumber={i + 1}
          selected={selectedPages?.has(i)}
          rotation={rotations?.get(i)}
          onClick={() => onTogglePage?.(i)}
          overlay={overlay?.(i)}
          draggable={draggable}
          onDragStart={draggable ? (e) => onDragStart?.(e, i) : undefined}
          onDragOver={draggable ? (e) => onDragOver?.(e, i) : undefined}
          onDrop={draggable ? (e) => onDrop?.(e, i) : undefined}
        />
      ))}
    </div>
  )
}
