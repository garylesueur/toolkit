"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select"
import { RiDownload2Line } from "@remixicon/react"
import {
  renderQrToCanvas,
  generateQrSvg,
  downloadCanvasAsPng,
} from "@/lib/qr-code/generate"
import type { ErrorCorrectionLevel } from "@/lib/qr-code/generate"

const ERROR_CORRECTION_OPTIONS: {
  value: ErrorCorrectionLevel
  label: string
}[] = [
  { value: "L", label: "Low (L)" },
  { value: "M", label: "Medium (M)" },
  { value: "Q", label: "Quartile (Q)" },
  { value: "H", label: "High (H)" },
]

const QR_CANVAS_WIDTH = 300

export default function QrCodeGeneratorPage() {
  const [text, setText] = useState("")
  const [errorCorrection, setErrorCorrection] =
    useState<ErrorCorrectionLevel>("M")
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    if (!text.trim()) {
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
      canvas.width = 0
      canvas.height = 0
      setError(null)
      return
    }

    let cancelled = false

    renderQrToCanvas(canvas, text, {
      errorCorrectionLevel: errorCorrection,
      width: QR_CANVAS_WIDTH,
    })
      .then(() => {
        if (!cancelled) setError(null)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })

    return () => {
      cancelled = true
    }
  }, [text, errorCorrection])

  const handleDownloadPng = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !text.trim()) return
    downloadCanvasAsPng(canvas, "qr-code.png")
  }, [text])

  const handleDownloadSvg = useCallback(async () => {
    if (!text.trim()) return

    try {
      const svg = await generateQrSvg(text, {
        errorCorrectionLevel: errorCorrection,
      })
      const blob = new Blob([svg], { type: "image/svg+xml" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "qr-code.svg"
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate SVG.")
    }
  }, [text, errorCorrection])

  const hasText = text.trim().length > 0

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">QR Code Generator</h1>
      <p className="text-muted-foreground mt-1">
        Enter text or a URL to generate a QR code. Download as SVG or PNG.
      </p>

      <div className="mt-8">
        <label htmlFor="qr-input" className="sr-only">
          Text or URL
        </label>
        <Input
          id="qr-input"
          placeholder="Enter text or URL…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="font-mono"
        />
      </div>

      <div className="mt-6">
        <Label>Error correction</Label>
        <Select
          value={errorCorrection}
          onValueChange={(v) => setErrorCorrection(v as ErrorCorrectionLevel)}
        >
          <SelectTrigger className="mt-1.5 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ERROR_CORRECTION_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-8 flex flex-col items-center">
        {hasText ? (
          <canvas
            ref={canvasRef}
            className="rounded-lg border"
          />
        ) : (
          <>
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex h-[300px] w-[300px] items-center justify-center rounded-lg border border-dashed">
              <p className="text-muted-foreground text-sm">
                Your QR code will appear here
              </p>
            </div>
          </>
        )}
      </div>

      <div className="mt-6 flex justify-center gap-3">
        <Button onClick={handleDownloadPng} disabled={!hasText}>
          <RiDownload2Line data-icon="inline-start" />
          Download PNG
        </Button>
        <Button variant="outline" onClick={handleDownloadSvg} disabled={!hasText}>
          <RiDownload2Line data-icon="inline-start" />
          Download SVG
        </Button>
      </div>
    </div>
  )
}
