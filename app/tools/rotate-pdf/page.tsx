"use client"

import { useState, useCallback } from "react"
import { usePdfDocument } from "@/hooks/use-pdf-document"
import { rotatePdfPages } from "@/lib/pdf/rotate"
import { downloadPdf } from "@/lib/pdf/download"
import { PdfDropZone } from "@/components/pdf/pdf-drop-zone"
import { PageThumbnailGrid } from "@/components/pdf/page-thumbnail-grid"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { RotationAngle } from "@/lib/pdf/constants"
import {
  RiArrowGoBackLine,
  RiArrowGoForwardLine,
  RiDownload2Line,
  RiLoader4Line,
  RiDeleteBin6Line,
} from "@remixicon/react"

export default function RotatePdfPage() {
  const { pdfBytes, pageCount, thumbnails, fileName, loading, error, loadFile, reset } =
    usePdfDocument()
  const [rotations, setRotations] = useState<Map<number, RotationAngle>>(new Map())
  const [saving, setSaving] = useState(false)

  const rotateAll = useCallback(
    (direction: 90 | 270) => {
      setRotations((prev) => {
        const next = new Map(prev)
        for (let i = 0; i < pageCount; i++) {
          const current = next.get(i) ?? 0
          next.set(i, ((current + direction) % 360) as RotationAngle)
        }
        return next
      })
    },
    [pageCount],
  )

  const togglePage = useCallback((index: number) => {
    setRotations((prev) => {
      const next = new Map(prev)
      const current = next.get(index) ?? 0
      next.set(index, ((current + 90) % 360) as RotationAngle)
      return next
    })
  }, [])

  const handleSave = useCallback(async () => {
    if (!pdfBytes || rotations.size === 0) return
    setSaving(true)
    try {
      const result = await rotatePdfPages(pdfBytes, rotations)
      const baseName = (fileName ?? "document").replace(/\.pdf$/i, "")
      await downloadPdf(result, `${baseName}-rotated.pdf`)
    } finally {
      setSaving(false)
    }
  }, [pdfBytes, rotations, fileName])

  const changedCount = Array.from(rotations.values()).filter((r) => r !== 0).length

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Rotate PDF</h1>
      <p className="text-muted-foreground mt-1">
        Click a page to rotate it 90°. Use bulk buttons to rotate all pages at
        once.
      </p>

      <div className="mt-8">
        <PdfDropZone onFiles={(files) => loadFile(files[0])} compact={!!pdfBytes} />
      </div>

      {loading && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <RiLoader4Line className="text-muted-foreground size-5 animate-spin" />
          <span className="text-muted-foreground text-sm">Loading PDF…</span>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {thumbnails.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => rotateAll(270)}>
              <RiArrowGoBackLine data-icon="inline-start" />
              Rotate All Left
            </Button>
            <Button variant="outline" size="sm" onClick={() => rotateAll(90)}>
              <RiArrowGoForwardLine data-icon="inline-start" />
              Rotate All Right
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                reset()
                setRotations(new Map())
              }}
            >
              <RiDeleteBin6Line data-icon="inline-start" />
              Clear
            </Button>

            <div className="ml-auto flex items-center gap-2">
              {changedCount > 0 && (
                <Badge>
                  {changedCount} page{changedCount !== 1 ? "s" : ""} rotated
                </Badge>
              )}
              <Button
                size="sm"
                onClick={handleSave}
                disabled={changedCount === 0 || saving}
              >
                {saving ? (
                  <RiLoader4Line className="size-4 animate-spin" />
                ) : (
                  <RiDownload2Line data-icon="inline-start" />
                )}
                Save & Download
              </Button>
            </div>
          </div>

          <PageThumbnailGrid
            thumbnails={thumbnails}
            rotations={rotations}
            onTogglePage={togglePage}
          />
        </div>
      )}
    </div>
  )
}
