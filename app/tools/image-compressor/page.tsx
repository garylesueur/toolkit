"use client"

import { useState, useRef, useCallback } from "react"
import { compressImage, formatBytes } from "@/lib/image-compressor/compress"
import type { OutputFormat } from "@/lib/image-compressor/compress"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  RiLockLine,
  RiLockUnlockLine,
} from "@remixicon/react"

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"]

type CompressionResult = {
  blob: Blob
  url: string
}

export default function ImageCompressorPage() {
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [sourceFileSize, setSourceFileSize] = useState(0)
  const [originalWidth, setOriginalWidth] = useState(0)
  const [originalHeight, setOriginalHeight] = useState(0)
  const [targetWidth, setTargetWidth] = useState(0)
  const [targetHeight, setTargetHeight] = useState(0)
  const [aspectLocked, setAspectLocked] = useState(true)
  const [format, setFormat] = useState<OutputFormat>("image/webp")
  const [quality, setQuality] = useState(80)
  const [compressing, setCompressing] = useState(false)
  const [result, setResult] = useState<CompressionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultUrlRef = useRef<string | null>(null)

  const cleanupResult = useCallback(() => {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current)
      resultUrlRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    setSourceImage(null)
    if (sourceUrl) URL.revokeObjectURL(sourceUrl)
    setSourceUrl(null)
    setSourceFileSize(0)
    setOriginalWidth(0)
    setOriginalHeight(0)
    setTargetWidth(0)
    setTargetHeight(0)
    setError(null)
    setResult(null)
    cleanupResult()
  }, [sourceUrl, cleanupResult])

  const loadFile = useCallback(
    (file: File) => {
      reset()

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError("Please upload a PNG, JPEG, WebP, or GIF image.")
        return
      }

      setSourceFileSize(file.size)
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        setSourceImage(img)
        setSourceUrl(url)
        setOriginalWidth(img.naturalWidth)
        setOriginalHeight(img.naturalHeight)
        setTargetWidth(img.naturalWidth)
        setTargetHeight(img.naturalHeight)
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        setError("Failed to load image.")
      }
      img.src = url
    },
    [reset],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) loadFile(file)
    },
    [loadFile],
  )

  const handleWidthChange = useCallback(
    (value: number) => {
      setTargetWidth(value)
      if (aspectLocked && originalWidth > 0) {
        const ratio = originalHeight / originalWidth
        setTargetHeight(Math.round(value * ratio))
      }
    },
    [aspectLocked, originalWidth, originalHeight],
  )

  const handleHeightChange = useCallback(
    (value: number) => {
      setTargetHeight(value)
      if (aspectLocked && originalHeight > 0) {
        const ratio = originalWidth / originalHeight
        setTargetWidth(Math.round(value * ratio))
      }
    },
    [aspectLocked, originalWidth, originalHeight],
  )

  const handleCompress = useCallback(async () => {
    if (!sourceImage) return
    if (targetWidth <= 0 || targetHeight <= 0) {
      setError("Width and height must be greater than zero.")
      return
    }

    setCompressing(true)
    setError(null)
    cleanupResult()
    setResult(null)

    try {
      const blob = await compressImage(
        sourceImage,
        targetWidth,
        targetHeight,
        format,
        quality / 100,
      )
      const url = URL.createObjectURL(blob)
      resultUrlRef.current = url
      setResult({ blob, url })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compression failed.")
    } finally {
      setCompressing(false)
    }
  }, [sourceImage, targetWidth, targetHeight, format, quality, cleanupResult])

  const handleDownload = useCallback(() => {
    if (!result) return
    const extension = format.split("/")[1]
    const a = document.createElement("a")
    a.href = result.url
    a.download = `compressed.${extension}`
    a.click()
  }, [result, format])

  const supportsQuality = format === "image/jpeg" || format === "image/webp"

  const savedBytes = result ? sourceFileSize - result.blob.size : 0
  const savedPercent =
    result && sourceFileSize > 0
      ? Math.round((savedBytes / sourceFileSize) * 100)
      : 0

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        Image Compressor / Resizer
      </h1>
      <p className="text-muted-foreground mt-1">
        Drop an image, pick target dimensions and quality, and download the
        optimised version.
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
        className={`mt-8 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground/40"
        }`}
      >
        {sourceUrl ? (
          <div className="flex flex-col items-center gap-3">
            <img
              src={sourceUrl}
              alt="Source"
              className="max-h-40 max-w-full rounded-md object-contain"
            />
            <p className="text-sm font-medium">
              {originalWidth}×{originalHeight} &middot;{" "}
              {formatBytes(sourceFileSize)}
            </p>
            <p className="text-muted-foreground text-xs">
              Click or drop to replace
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <RiUploadCloud2Line className="text-muted-foreground size-10" />
            <p className="text-sm font-medium">
              Drop your image here, or click to browse
            </p>
            <p className="text-muted-foreground text-xs">
              PNG, JPEG, WebP, or GIF
            </p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) loadFile(file)
            e.target.value = ""
          }}
        />
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {/* Controls */}
      {sourceImage && (
        <div className="mt-8 space-y-6">
          {/* Dimensions */}
          <div>
            <h2 className="text-sm font-semibold">Dimensions</h2>
            <div className="mt-3 flex items-end gap-3">
              <div className="flex-1">
                <Label htmlFor="target-width">Width</Label>
                <Input
                  id="target-width"
                  type="number"
                  min={1}
                  value={targetWidth}
                  onChange={(e) =>
                    handleWidthChange(parseInt(e.target.value, 10) || 0)
                  }
                  className="mt-1.5"
                />
              </div>

              <button
                type="button"
                onClick={() => setAspectLocked((prev) => !prev)}
                className="text-muted-foreground hover:text-foreground mb-1.5 flex size-9 shrink-0 items-center justify-center rounded-md border transition-colors"
                title={
                  aspectLocked ? "Unlock aspect ratio" : "Lock aspect ratio"
                }
              >
                {aspectLocked ? (
                  <RiLockLine className="size-4" />
                ) : (
                  <RiLockUnlockLine className="size-4" />
                )}
              </button>

              <div className="flex-1">
                <Label htmlFor="target-height">Height</Label>
                <Input
                  id="target-height"
                  type="number"
                  min={1}
                  value={targetHeight}
                  onChange={(e) =>
                    handleHeightChange(parseInt(e.target.value, 10) || 0)
                  }
                  className="mt-1.5"
                />
              </div>
            </div>
          </div>

          {/* Format & Quality */}
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
              <div className="flex-1 min-w-48">
                <Label htmlFor="quality-slider">
                  Quality: {quality}%
                </Label>
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

          {/* Action */}
          <div className="flex gap-3">
            <Button onClick={handleCompress} disabled={compressing}>
              {compressing ? "Compressing…" : "Compress & Download"}
            </Button>
            {result && (
              <Button variant="outline" onClick={handleDownload}>
                <RiDownload2Line data-icon="inline-start" />
                Download
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Result stats */}
      {result && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold">Result</h2>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Badge variant="secondary">
              Original: {formatBytes(sourceFileSize)}
            </Badge>
            <Badge variant="secondary">
              Compressed: {formatBytes(result.blob.size)}
            </Badge>
            <Badge variant={savedBytes > 0 ? "default" : "secondary"}>
              {savedBytes > 0
                ? `Saved ${formatBytes(savedBytes)} (${savedPercent}%)`
                : savedBytes === 0
                  ? "Same size"
                  : `Larger by ${formatBytes(Math.abs(savedBytes))}`}
            </Badge>
          </div>
        </div>
      )}
    </div>
  )
}
