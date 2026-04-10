"use client"

import { useState, useCallback } from "react"
import { compressPdf } from "@/lib/pdf/compress"
import { downloadPdf } from "@/lib/pdf/download"
import { PdfDropZone } from "@/components/pdf/pdf-drop-zone"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  RiDownload2Line,
  RiLoader4Line,
  RiDeleteBin6Line,
} from "@remixicon/react"

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function CompressPdfPage() {
  const [file, setFile] = useState<File | null>(null)
  const [stripMetadata, setStripMetadata] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{
    originalSize: number
    compressedSize: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0])
    setResult(null)
    setError(null)
  }, [])

  const handleCompress = useCallback(async () => {
    if (!file) return
    setSaving(true)
    setError(null)
    try {
      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      const { pdfDoc, originalSize, compressedSize } = await compressPdf(bytes, {
        stripMetadata,
      })
      setResult({ originalSize, compressedSize })
      const baseName = file.name.replace(/\.pdf$/i, "")
      await downloadPdf(pdfDoc, `${baseName}-compressed.pdf`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compression failed.")
    } finally {
      setSaving(false)
    }
  }, [file, stripMetadata])

  const saved = result ? result.originalSize - result.compressedSize : 0
  const savedPercent =
    result && result.originalSize > 0
      ? Math.round((saved / result.originalSize) * 100)
      : 0

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Compress PDF</h1>
      <p className="text-muted-foreground mt-1">
        Re-save your PDF to strip unused objects and reduce file size. Works best
        on PDFs that have been edited many times.
      </p>

      <div className="mt-8">
        <PdfDropZone onFiles={handleFiles} compact={!!file} />
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {file && (
        <div className="mt-6 space-y-4">
          <div className="rounded-lg border p-4">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-muted-foreground text-xs">
              {formatBytes(file.size)}
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={stripMetadata}
              onChange={(e) => setStripMetadata(e.target.checked)}
              className="accent-primary"
            />
            Also strip metadata (title, author, etc.)
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFile(null)
                setResult(null)
                setError(null)
              }}
            >
              <RiDeleteBin6Line data-icon="inline-start" />
              Remove
            </Button>

            <div className="ml-auto flex items-center gap-2">
              {result && (
                <>
                  <Badge variant="secondary">
                    {formatBytes(result.originalSize)}
                  </Badge>
                  <span className="text-muted-foreground text-xs">→</span>
                  <Badge variant="secondary">
                    {formatBytes(result.compressedSize)}
                  </Badge>
                  <Badge variant={saved > 0 ? "default" : "secondary"}>
                    {saved > 0
                      ? `−${formatBytes(saved)} (${savedPercent}%)`
                      : "No size reduction"}
                  </Badge>
                </>
              )}
              <Button size="sm" onClick={handleCompress} disabled={saving}>
                {saving ? (
                  <RiLoader4Line className="size-4 animate-spin" />
                ) : (
                  <RiDownload2Line data-icon="inline-start" />
                )}
                Compress & Download
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
