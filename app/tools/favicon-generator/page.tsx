"use client"

import { useState, useRef, useCallback } from "react"
import { generateFavicons, buildHeadSnippet } from "@/lib/favicon/generate"
import { faviconTargets } from "@/lib/favicon/sizes"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { RiUploadCloud2Line, RiDownload2Line, RiFileCopyLine, RiCheckLine } from "@remixicon/react"

type GeneratedPreview = {
  filename: string
  size: number
  url: string
}

export default function FaviconGeneratorPage() {
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [sourceDimensions, setSourceDimensions] = useState<{ w: number; h: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [previews, setPreviews] = useState<GeneratedPreview[]>([])
  const [zipBlob, setZipBlob] = useState<Blob | null>(null)
  const [copied, setCopied] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const previewUrlsRef = useRef<string[]>([])

  const reset = useCallback(() => {
    setSourceImage(null)
    if (sourceUrl) URL.revokeObjectURL(sourceUrl)
    setSourceUrl(null)
    setSourceDimensions(null)
    setError(null)
    setPreviews([])
    setZipBlob(null)
    setCopied(false)
    for (const url of previewUrlsRef.current) URL.revokeObjectURL(url)
    previewUrlsRef.current = []
  }, [sourceUrl])

  const loadFile = useCallback(
    (file: File) => {
      reset()

      if (!file.type.startsWith("image/png")) {
        setError("Please upload a PNG file.")
        return
      }

      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        const longest = Math.max(img.naturalWidth, img.naturalHeight)
        if (longest < 512) {
          URL.revokeObjectURL(url)
          setError(
            `Image must be at least 512px on its longest side. Yours is ${img.naturalWidth}×${img.naturalHeight}.`,
          )
          return
        }
        setSourceImage(img)
        setSourceUrl(url)
        setSourceDimensions({ w: img.naturalWidth, h: img.naturalHeight })
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

  const handleGenerate = useCallback(async () => {
    if (!sourceImage) return
    setGenerating(true)
    setError(null)

    try {
      const blob = await generateFavicons(sourceImage)
      setZipBlob(blob)

      const newPreviews: GeneratedPreview[] = []
      const srcW = sourceImage.naturalWidth
      const srcH = sourceImage.naturalHeight
      for (const target of faviconTargets) {
        const canvas = document.createElement("canvas")
        canvas.width = target.size
        canvas.height = target.size
        const ctx = canvas.getContext("2d")!
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = "high"
        const scale = target.size / Math.max(srcW, srcH)
        const drawW = Math.round(srcW * scale)
        const drawH = Math.round(srcH * scale)
        const offsetX = Math.round((target.size - drawW) / 2)
        const offsetY = Math.round((target.size - drawH) / 2)
        ctx.drawImage(sourceImage, offsetX, offsetY, drawW, drawH)
        const previewUrl = canvas.toDataURL("image/png")
        previewUrlsRef.current.push(previewUrl)
        newPreviews.push({
          filename: target.filename,
          size: target.size,
          url: previewUrl,
        })
      }
      setPreviews(newPreviews)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.")
    } finally {
      setGenerating(false)
    }
  }, [sourceImage])

  const handleDownload = useCallback(() => {
    if (!zipBlob) return
    const url = URL.createObjectURL(zipBlob)
    const a = document.createElement("a")
    a.href = url
    a.download = "favicons.zip"
    a.click()
    URL.revokeObjectURL(url)
  }, [zipBlob])

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(buildHeadSnippet())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Favicon Generator</h1>
      <p className="text-muted-foreground mt-1">
        Upload a PNG (at least 512px) and download every favicon size your site
        needs. Non-square images are centred on a transparent background.
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
              alt="Source icon"
              className="size-24 rounded-md object-contain"
            />
            <p className="text-sm font-medium">
              {sourceDimensions?.w}×{sourceDimensions?.h} PNG
            </p>
            <p className="text-muted-foreground text-xs">
              Click or drop to replace
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <RiUploadCloud2Line className="text-muted-foreground size-10" />
            <p className="text-sm font-medium">
              Drop your PNG here, or click to browse
            </p>
            <p className="text-muted-foreground text-xs">
              At least 512px on the longest side
            </p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) loadFile(file)
            e.target.value = ""
          }}
        />
      </div>

      {error && (
        <p className="mt-4 text-sm text-destructive">{error}</p>
      )}

      {/* Actions */}
      {sourceImage && (
        <div className="mt-6 flex gap-3">
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? "Generating…" : "Generate favicons"}
          </Button>
          {zipBlob && (
            <Button variant="outline" onClick={handleDownload}>
              <RiDownload2Line data-icon="inline-start" />
              Download ZIP
            </Button>
          )}
        </div>
      )}

      {/* Preview grid */}
      {previews.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold">Generated sizes</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {previews.map((p) => (
              <Card key={p.filename} className="flex flex-col items-center gap-3 p-4">
                <div className="flex size-20 items-center justify-center">
                  <img
                    src={p.url}
                    alt={p.filename}
                    style={{
                      width: Math.min(p.size, 80),
                      height: Math.min(p.size, 80),
                    }}
                    className="rounded-sm"
                  />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Badge variant="secondary">
                    {p.size}×{p.size}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    {p.filename}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Head snippet */}
      {zipBlob && (
        <div className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">HTML snippet</h2>
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              {copied ? (
                <RiCheckLine data-icon="inline-start" />
              ) : (
                <RiFileCopyLine data-icon="inline-start" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <pre className="bg-muted mt-3 overflow-x-auto rounded-lg p-4 text-sm">
            <code>{buildHeadSnippet()}</code>
          </pre>
        </div>
      )}
    </div>
  )
}
