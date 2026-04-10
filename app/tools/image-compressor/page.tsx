"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import {
  compressSingleFile,
  buildBatchZip,
  formatBytes,
} from "@/lib/image-compressor/compress"
import type { OutputFormat } from "@/lib/image-compressor/compress"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select"
import {
  RiUploadCloud2Line,
  RiDownload2Line,
  RiCloseLine,
  RiLoader4Line,
  RiDeleteBin6Line,
  RiRefreshLine,
} from "@remixicon/react"

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"]
const MAX_CONCURRENCY = 3

type ImageItem = {
  id: string
  file: File
  sourceUrl: string
  sourceFileSize: number
  originalWidth: number
  originalHeight: number
  status: "compressing" | "done" | "error"
  result: { blob: Blob; url: string } | null
  error: string | null
  compressedWith: { format: OutputFormat; quality: number } | null
}

export default function ImageCompressorPage() {
  const [items, setItems] = useState<ImageItem[]>([])
  const [format, setFormat] = useState<OutputFormat>("image/webp")
  const [quality, setQuality] = useState(80)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const queueRef = useRef<Array<{ id: string; file: File }>>([])
  const activeRef = useRef(0)

  const updateItem = useCallback(
    (id: string, patch: Partial<ImageItem>) =>
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i))),
    [],
  )

  const processQueue = useCallback(
    async (currentFormat: OutputFormat, currentQuality: number) => {
      while (queueRef.current.length > 0 && activeRef.current < MAX_CONCURRENCY) {
        const next = queueRef.current.shift()
        if (!next) break
        activeRef.current++

        compressSingleFile(next.file, currentFormat, currentQuality / 100)
          .then(({ sourceUrl, img, blob }) => {
            const resultUrl = URL.createObjectURL(blob)
            updateItem(next.id, {
              sourceUrl,
              originalWidth: img.naturalWidth,
              originalHeight: img.naturalHeight,
              status: "done",
              result: { blob, url: resultUrl },
              compressedWith: { format: currentFormat, quality: currentQuality },
            })
          })
          .catch((err) => {
            updateItem(next.id, {
              status: "error",
              error: err instanceof Error ? err.message : "Compression failed.",
            })
          })
          .finally(() => {
            activeRef.current--
            processQueue(currentFormat, currentQuality)
          })
      }
    },
    [updateItem],
  )

  const loadFiles = useCallback(
    (fileList: FileList) => {
      const validFiles = Array.from(fileList).filter((f) =>
        ACCEPTED_TYPES.includes(f.type),
      )
      if (validFiles.length === 0) return

      const newItems: ImageItem[] = validFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        sourceUrl: "",
        sourceFileSize: file.size,
        originalWidth: 0,
        originalHeight: 0,
        status: "compressing" as const,
        result: null,
        error: null,
        compressedWith: null,
      }))

      setItems((prev) => [...prev, ...newItems])

      for (const item of newItems) {
        queueRef.current.push({ id: item.id, file: item.file })
      }
      processQueue(format, quality)
    },
    [format, quality, processQueue],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      if (e.dataTransfer.files.length > 0) loadFiles(e.dataTransfer.files)
    },
    [loadFiles],
  )

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id)
      if (item) {
        if (item.sourceUrl) URL.revokeObjectURL(item.sourceUrl)
        if (item.result?.url) URL.revokeObjectURL(item.result.url)
      }
      return prev.filter((i) => i.id !== id)
    })
  }, [])

  const clearAll = useCallback(() => {
    setItems((prev) => {
      for (const item of prev) {
        if (item.sourceUrl) URL.revokeObjectURL(item.sourceUrl)
        if (item.result?.url) URL.revokeObjectURL(item.result.url)
      }
      return []
    })
    queueRef.current = []
  }, [])

  const recompressAll = useCallback(() => {
    setItems((prev) => {
      for (const item of prev) {
        if (item.result?.url) URL.revokeObjectURL(item.result.url)
      }
      return prev.map((i) => ({
        ...i,
        status: "compressing" as const,
        result: null,
        error: null,
        compressedWith: null,
      }))
    })

    setItems((prev) => {
      queueRef.current = prev.map((i) => ({ id: i.id, file: i.file }))
      processQueue(format, quality)
      return prev
    })
  }, [format, quality, processQueue])

  const handleDownloadSingle = useCallback((item: ImageItem) => {
    if (!item.result) return
    const ext = item.compressedWith?.format.split("/")[1] ?? "webp"
    const baseName = item.file.name.replace(/\.[^.]+$/, "")
    const a = document.createElement("a")
    a.href = item.result.url
    a.download = `${baseName}.${ext}`
    a.click()
  }, [])

  const handleDownloadZip = useCallback(async () => {
    const doneItems = items.filter((i) => i.status === "done" && i.result)
    if (doneItems.length === 0) return

    const entries = doneItems.map((item) => {
      const ext = item.compressedWith?.format.split("/")[1] ?? "webp"
      const baseName = item.file.name.replace(/\.[^.]+$/, "")
      return { name: `${baseName}.${ext}`, blob: item.result!.blob }
    })

    const zipBlob = await buildBatchZip(entries)
    const url = URL.createObjectURL(zipBlob)
    const a = document.createElement("a")
    a.href = url
    a.download = "compressed-images.zip"
    a.click()
    URL.revokeObjectURL(url)
  }, [items])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setItems((prev) => {
        for (const item of prev) {
          if (item.sourceUrl) URL.revokeObjectURL(item.sourceUrl)
          if (item.result?.url) URL.revokeObjectURL(item.result.url)
        }
        return prev
      })
    }
  }, [])

  const doneCount = items.filter((i) => i.status === "done").length
  const compressingCount = items.filter((i) => i.status === "compressing").length
  const settingsChanged = items.some(
    (i) =>
      i.status === "done" &&
      i.compressedWith &&
      (i.compressedWith.format !== format || i.compressedWith.quality !== quality),
  )

  const totalOriginal = items.reduce((sum, i) => sum + i.sourceFileSize, 0)
  const totalCompressed = items.reduce(
    (sum, i) => sum + (i.result?.blob.size ?? 0),
    0,
  )
  const totalSaved = totalOriginal - totalCompressed
  const totalSavedPercent =
    totalOriginal > 0 ? Math.round((totalSaved / totalOriginal) * 100) : 0

  const supportsQuality = format === "image/jpeg" || format === "image/webp"

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        Image Compressor
      </h1>
      <p className="text-muted-foreground mt-1">
        Drop images to compress them instantly. Download individually or as a
        ZIP.
      </p>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`mt-8 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
          items.length > 0 ? "p-6" : "p-10"
        } ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground/40"
        }`}
      >
        <div className="flex flex-col items-center gap-2">
          <RiUploadCloud2Line className="text-muted-foreground size-8" />
          <p className="text-sm font-medium">
            {items.length > 0
              ? "Drop more images, or click to browse"
              : "Drop your images here, or click to browse"}
          </p>
          <p className="text-muted-foreground text-xs">
            PNG, JPEG, WebP, or GIF &middot; Multiple files supported
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = e.target.files
            if (files && files.length > 0) loadFiles(files)
            e.target.value = ""
          }}
        />
      </div>

      {/* Settings + actions */}
      {items.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-end gap-6">
            <div>
              <Label>Output format</Label>
              <Select
                value={format}
                onValueChange={(v) => setFormat(v as OutputFormat)}
              >
                <SelectTrigger className="mt-1.5 w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image/png">PNG</SelectItem>
                  <SelectItem value="image/jpeg">JPEG</SelectItem>
                  <SelectItem value="image/webp">WebP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {supportsQuality && (
              <div className="min-w-48 flex-1">
                <Label htmlFor="quality-slider">Quality: {quality}%</Label>
                <input
                  id="quality-slider"
                  type="range"
                  min={1}
                  max={100}
                  value={quality}
                  onChange={(e) => setQuality(parseInt(e.target.value, 10))}
                  className="mt-1.5 w-full accent-primary"
                />
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {settingsChanged && (
              <Button variant="outline" size="sm" onClick={recompressAll}>
                <RiRefreshLine data-icon="inline-start" />
                Re-compress All
              </Button>
            )}
            {doneCount >= 2 && (
              <Button variant="outline" size="sm" onClick={handleDownloadZip}>
                <RiDownload2Line data-icon="inline-start" />
                Download All as ZIP
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={clearAll}>
              <RiDeleteBin6Line data-icon="inline-start" />
              Clear All
            </Button>

            {/* Summary stats */}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {compressingCount > 0 && (
                <Badge variant="secondary">
                  {compressingCount} compressing…
                </Badge>
              )}
              {doneCount > 0 && totalSaved > 0 && (
                <Badge>
                  Total saved: {formatBytes(totalSaved)} ({totalSavedPercent}%)
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image items */}
      {items.length > 0 && (
        <div className="mt-6 space-y-4">
          {items.map((item) => (
            <ImageItemCard
              key={item.id}
              item={item}
              onRemove={() => removeItem(item.id)}
              onDownload={() => handleDownloadSingle(item)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ImageItemCard({
  item,
  onRemove,
  onDownload,
}: {
  item: ImageItem
  onRemove: () => void
  onDownload: () => void
}) {
  const savedBytes = item.result
    ? item.sourceFileSize - item.result.blob.size
    : 0
  const savedPercent =
    item.result && item.sourceFileSize > 0
      ? Math.round((savedBytes / item.sourceFileSize) * 100)
      : 0

  return (
    <div className="rounded-lg border p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium">{item.file.name}</p>
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground hover:text-foreground shrink-0 rounded-md p-1 transition-colors"
          title="Remove"
        >
          <RiCloseLine className="size-4" />
        </button>
      </div>

      {/* Side-by-side previews */}
      <div className="mt-3 grid grid-cols-2 gap-4">
        {/* Original */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-muted-foreground text-xs font-medium uppercase">
            Original
          </p>
          {item.sourceUrl ? (
            <img
              src={item.sourceUrl}
              alt="Original"
              className="max-h-48 max-w-full rounded-md object-contain"
            />
          ) : (
            <div className="flex h-32 items-center justify-center">
              <RiLoader4Line className="text-muted-foreground size-5 animate-spin" />
            </div>
          )}
        </div>

        {/* Compressed */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-muted-foreground text-xs font-medium uppercase">
            Compressed
          </p>
          {item.status === "compressing" && (
            <div className="flex h-32 items-center justify-center">
              <RiLoader4Line className="text-muted-foreground size-5 animate-spin" />
            </div>
          )}
          {item.status === "done" && item.result && (
            <img
              src={item.result.url}
              alt="Compressed"
              className="max-h-48 max-w-full rounded-md object-contain"
            />
          )}
          {item.status === "error" && (
            <div className="flex h-32 items-center justify-center">
              <p className="text-sm text-destructive">{item.error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats + download */}
      {item.status === "done" && item.result && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {formatBytes(item.sourceFileSize)}
          </Badge>
          <span className="text-muted-foreground text-xs">→</span>
          <Badge variant="secondary">
            {formatBytes(item.result.blob.size)}
          </Badge>
          <Badge variant={savedBytes > 0 ? "default" : "secondary"}>
            {savedBytes > 0
              ? `−${formatBytes(savedBytes)} (${savedPercent}%)`
              : savedBytes === 0
                ? "Same size"
                : `+${formatBytes(Math.abs(savedBytes))}`}
          </Badge>
          {item.originalWidth > 0 && (
            <span className="text-muted-foreground text-xs">
              {item.originalWidth}×{item.originalHeight}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onDownload}
            className="ml-auto"
          >
            <RiDownload2Line data-icon="inline-start" />
            Download
          </Button>
        </div>
      )}
    </div>
  )
}
