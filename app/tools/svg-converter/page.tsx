"use client"

import { useState, useRef, useCallback } from "react"
import { convertSvgToRaster } from "@/lib/svg-converter/convert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  RiUploadCloud2Line,
  RiDownload2Line,
  RiLock2Line,
  RiLockUnlockLine,
} from "@remixicon/react"

type OutputFormat = "image/png" | "image/jpeg"

type SvgDimensions = {
  width: number
  height: number
}

/** Attempt to read the intrinsic width/height from an SVG string. */
function parseSvgDimensions(svgSource: string): SvgDimensions | null {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgSource, "image/svg+xml")
  const svg = doc.querySelector("svg")
  if (!svg) return null

  const widthAttr = svg.getAttribute("width")
  const heightAttr = svg.getAttribute("height")

  if (widthAttr && heightAttr) {
    const w = parseFloat(widthAttr)
    const h = parseFloat(heightAttr)
    if (w > 0 && h > 0) return { width: Math.round(w), height: Math.round(h) }
  }

  const viewBox = svg.getAttribute("viewBox")
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/)
    if (parts.length === 4) {
      const w = parseFloat(parts[2])
      const h = parseFloat(parts[3])
      if (w > 0 && h > 0) return { width: Math.round(w), height: Math.round(h) }
    }
  }

  return null
}

export default function SvgConverterPage() {
  const [svgSource, setSvgSource] = useState<string | null>(null)
  const [svgPreviewUrl, setSvgPreviewUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [width, setWidth] = useState(512)
  const [height, setHeight] = useState(512)
  const [aspectRatio, setAspectRatio] = useState(1)
  const [lockAspect, setLockAspect] = useState(true)
  const [format, setFormat] = useState<OutputFormat>("image/png")
  const [quality, setQuality] = useState(0.9)
  const [converting, setConverting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setSvgSource(null)
    if (svgPreviewUrl) URL.revokeObjectURL(svgPreviewUrl)
    setSvgPreviewUrl(null)
    setFileName(null)
    setError(null)
  }, [svgPreviewUrl])

  const loadFile = useCallback(
    (file: File) => {
      reset()

      if (file.type !== "image/svg+xml" && !file.name.endsWith(".svg")) {
        setError("Please upload an SVG file.")
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        const text = reader.result as string
        setSvgSource(text)
        setFileName(file.name)

        const blob = new Blob([text], { type: "image/svg+xml;charset=utf-8" })
        setSvgPreviewUrl(URL.createObjectURL(blob))

        const dims = parseSvgDimensions(text)
        if (dims) {
          setWidth(dims.width)
          setHeight(dims.height)
          setAspectRatio(dims.width / dims.height)
        } else {
          setWidth(512)
          setHeight(512)
          setAspectRatio(1)
        }
      }
      reader.onerror = () => {
        setError("Failed to read the SVG file.")
      }
      reader.readAsText(file)
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
      if (value < 1) return
      setWidth(value)
      if (lockAspect) {
        setHeight(Math.max(1, Math.round(value / aspectRatio)))
      }
    },
    [lockAspect, aspectRatio],
  )

  const handleHeightChange = useCallback(
    (value: number) => {
      if (value < 1) return
      setHeight(value)
      if (lockAspect) {
        setWidth(Math.max(1, Math.round(value * aspectRatio)))
      }
    },
    [lockAspect, aspectRatio],
  )

  const handleConvert = useCallback(async () => {
    if (!svgSource) return
    setConverting(true)
    setError(null)

    try {
      const blob = await convertSvgToRaster({
        svgSource,
        width,
        height,
        format,
        quality,
      })

      const ext = format === "image/png" ? "png" : "jpg"
      const baseName = fileName ? fileName.replace(/\.svg$/i, "") : "converted"
      const downloadName = `${baseName}-${width}x${height}.${ext}`

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = downloadName
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed.")
    } finally {
      setConverting(false)
    }
  }, [svgSource, width, height, format, quality, fileName])

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        SVG to PNG / JPEG Converter
      </h1>
      <p className="text-muted-foreground mt-1">
        Drop an SVG file, pick an output size and format, and download a
        rasterised PNG or JPEG.
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
        {svgPreviewUrl ? (
          <div className="flex flex-col items-center gap-3">
            <img
              src={svgPreviewUrl}
              alt="SVG preview"
              className="size-24 rounded-md object-contain"
            />
            <p className="text-sm font-medium">{fileName}</p>
            <p className="text-muted-foreground text-xs">
              Click or drop to replace
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <RiUploadCloud2Line className="text-muted-foreground size-10" />
            <p className="text-sm font-medium">
              Drop your SVG here, or click to browse
            </p>
            <p className="text-muted-foreground text-xs">
              Only .svg files are accepted
            </p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".svg,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) loadFile(file)
            e.target.value = ""
          }}
        />
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {/* Settings */}
      {svgSource && (
        <div className="mt-8 space-y-6">
          {/* Dimensions */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="svg-width">Width (px)</Label>
              <Input
                id="svg-width"
                type="number"
                min={1}
                value={width}
                onChange={(e) => handleWidthChange(Number(e.target.value))}
                className="w-28"
              />
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setLockAspect((prev) => !prev)}
              aria-label={lockAspect ? "Unlock aspect ratio" : "Lock aspect ratio"}
              title={lockAspect ? "Aspect ratio locked" : "Aspect ratio unlocked"}
            >
              {lockAspect ? (
                <RiLock2Line className="size-4" />
              ) : (
                <RiLockUnlockLine className="size-4" />
              )}
            </Button>

            <div className="space-y-1.5">
              <Label htmlFor="svg-height">Height (px)</Label>
              <Input
                id="svg-height"
                type="number"
                min={1}
                value={height}
                onChange={(e) => handleHeightChange(Number(e.target.value))}
                className="w-28"
              />
            </div>
          </div>

          {/* Format */}
          <div className="flex flex-wrap items-end gap-6">
            <div className="space-y-1.5">
              <Label>Format</Label>
              <Select
                value={format}
                onValueChange={(v) => setFormat(v as OutputFormat)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image/png">PNG</SelectItem>
                  <SelectItem value="image/jpeg">JPEG</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quality (JPEG only) */}
            {format === "image/jpeg" && (
              <div className="space-y-1.5">
                <Label htmlFor="svg-quality">
                  Quality: {quality.toFixed(1)}
                </Label>
                <input
                  id="svg-quality"
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.1}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="block h-9 w-40 accent-primary"
                />
              </div>
            )}
          </div>

          {/* Convert button */}
          <Button onClick={handleConvert} disabled={converting}>
            {converting ? (
              "Converting…"
            ) : (
              <>
                <RiDownload2Line data-icon="inline-start" />
                Convert &amp; Download
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
