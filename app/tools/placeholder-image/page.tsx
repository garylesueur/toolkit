"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RiFileCopyLine, RiCheckLine, RiDownload2Line } from "@remixicon/react"
import {
  renderPlaceholder,
  downloadPlaceholderPng,
  getPlaceholderDataUrl,
} from "@/lib/placeholder-image/generate"

const COPY_RESET_MS = 2000

const DEFAULT_WIDTH = 800
const DEFAULT_HEIGHT = 600
const DEFAULT_BG = "#cccccc"
const DEFAULT_TEXT_COLOUR = "#666666"
const DEFAULT_FONT_SIZE = 32

export default function PlaceholderImagePage() {
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [height, setHeight] = useState(DEFAULT_HEIGHT)
  const [backgroundColor, setBackgroundColor] = useState(DEFAULT_BG)
  const [textColor, setTextColor] = useState(DEFAULT_TEXT_COLOUR)
  const [overlayText, setOverlayText] = useState("")
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE)
  const [copied, setCopied] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)

  const resolvedText = overlayText.trim() || `${width}×${height}`

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    renderPlaceholder(canvas, {
      width,
      height,
      backgroundColor,
      textColor,
      text: resolvedText,
      fontSize,
    })
  }, [width, height, backgroundColor, textColor, resolvedText, fontSize])

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    downloadPlaceholderPng(canvas, `placeholder-${width}x${height}.png`)
  }, [width, height])

  const handleCopyDataUrl = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = getPlaceholderDataUrl(canvas)
    await navigator.clipboard.writeText(dataUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), COPY_RESET_MS)
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        Placeholder Image Generator
      </h1>
      <p className="text-muted-foreground mt-1">
        Pick dimensions, colours, and overlay text — get a downloadable
        placeholder PNG or a data URL.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="ph-width">Width (px)</Label>
          <Input
            id="ph-width"
            type="number"
            min={1}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value) || 1)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ph-height">Height (px)</Label>
          <Input
            id="ph-height"
            type="number"
            min={1}
            value={height}
            onChange={(e) => setHeight(Number(e.target.value) || 1)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ph-font-size">Font size (px)</Label>
          <Input
            id="ph-font-size"
            type="number"
            min={1}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value) || 1)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ph-bg">Background colour</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              className="h-9 w-9 shrink-0 cursor-pointer rounded-md border p-0.5"
            />
            <Input
              id="ph-bg"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              className="font-mono"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ph-text-colour">Text colour</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="h-9 w-9 shrink-0 cursor-pointer rounded-md border p-0.5"
            />
            <Input
              id="ph-text-colour"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="font-mono"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ph-overlay">Overlay text</Label>
          <Input
            id="ph-overlay"
            value={overlayText}
            onChange={(e) => setOverlayText(e.target.value)}
            placeholder={`${width}×${height}`}
          />
        </div>
      </div>

      <div className="mt-8">
        <div className="overflow-auto rounded-lg border p-2">
          <canvas
            ref={canvasRef}
            className="block max-w-full"
            style={{ height: "auto" }}
          />
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Button onClick={handleDownload}>
          <RiDownload2Line data-icon="inline-start" />
          Download PNG
        </Button>
        <Button variant="outline" onClick={handleCopyDataUrl}>
          {copied ? (
            <RiCheckLine data-icon="inline-start" />
          ) : (
            <RiFileCopyLine data-icon="inline-start" />
          )}
          {copied ? "Copied" : "Copy data URL"}
        </Button>
      </div>
    </div>
  )
}
