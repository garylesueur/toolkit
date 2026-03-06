"use client"

import { useState, useRef, useEffect, useCallback } from "react"
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
import { RiDownload2Line } from "@remixicon/react"
import { renderBanner, downloadBannerPng } from "@/lib/linkedin-banner/render"
import type { BannerOptions, GradientType, TextAlignment } from "@/lib/linkedin-banner/types"
import { GRADIENT_PRESETS, DEFAULT_PRESET } from "@/lib/linkedin-banner/presets"

const BANNER_WIDTH = 1584
const BANNER_HEIGHT = 396

const DEFAULT_TITLE_FONT_SIZE = 64
const DEFAULT_SUBTITLE_FONT_SIZE = 32
const DEFAULT_TEXT_COLOR = "#ffffff"
const DEFAULT_LOGO_SCALE = 0.3

export default function LinkedInBannerPage() {
  const [selectedPreset, setSelectedPreset] = useState<string>("Ocean")
  const [gradientStartColor, setGradientStartColor] = useState(
    DEFAULT_PRESET.startColor,
  )
  const [gradientEndColor, setGradientEndColor] = useState(
    DEFAULT_PRESET.endColor,
  )
  const [gradientAngle, setGradientAngle] = useState(DEFAULT_PRESET.angle)
  const [gradientType, setGradientType] = useState<GradientType>(
    DEFAULT_PRESET.type,
  )

  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null)
  const [logoScale, setLogoScale] = useState(DEFAULT_LOGO_SCALE)
  const [logoX, setLogoX] = useState(80)
  const [logoY, setLogoY] = useState(80)

  const [title, setTitle] = useState("")
  const [subtitle, setSubtitle] = useState("")
  const [titleFontSize, setTitleFontSize] = useState(DEFAULT_TITLE_FONT_SIZE)
  const [subtitleFontSize, setSubtitleFontSize] = useState(
    DEFAULT_SUBTITLE_FONT_SIZE,
  )
  const [textColor, setTextColor] = useState(DEFAULT_TEXT_COLOR)
  const [textAlignment, setTextAlignment] = useState<TextAlignment>("left")
  const [titleY, setTitleY] = useState(120)
  const [subtitleY, setSubtitleY] = useState(200)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePresetChange = useCallback((presetName: string) => {
    setSelectedPreset(presetName)
    const preset = GRADIENT_PRESETS.find((p) => p.name === presetName)
    if (preset) {
      setGradientStartColor(preset.startColor)
      setGradientEndColor(preset.endColor)
      setGradientAngle(preset.angle)
      setGradientType(preset.type)
    }
  }, [])

  const handleLogoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          setLogoImage(img)
        }
        img.onerror = () => {
          // Silently fail - user can try again
        }
        if (event.target?.result) {
          img.src = event.target.result as string
        }
      }
      reader.readAsDataURL(file)
    },
    [],
  )

  const handleRemoveLogo = useCallback(() => {
    setLogoImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const options: BannerOptions = {
      gradientStartColor,
      gradientEndColor,
      gradientAngle,
      gradientType,
      logo: {
        image: logoImage,
        scale: logoScale,
        x: logoX,
        y: logoY,
      },
      text: {
        title,
        subtitle,
        titleFontSize,
        subtitleFontSize,
        color: textColor,
        alignment: textAlignment,
        titleY,
        subtitleY,
      },
    }

    renderBanner(canvas, options)
  }, [
    gradientStartColor,
    gradientEndColor,
    gradientAngle,
    gradientType,
    logoImage,
    logoScale,
    logoX,
    logoY,
    title,
    subtitle,
    titleFontSize,
    subtitleFontSize,
    textColor,
    textAlignment,
    titleY,
    subtitleY,
  ])

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    downloadBannerPng(canvas, "linkedin-banner.png")
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        LinkedIn Banner Generator
      </h1>
      <p className="text-muted-foreground mt-1">
        Create a custom LinkedIn profile banner with gradients, logos, and text.
        The left portion is typically covered by your profile photo, so design
        accordingly.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {/* Left column - Controls */}
        <div className="space-y-8">
          {/* Gradient Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Background</h2>

            <div className="space-y-1.5">
              <Label htmlFor="gradient-preset">Gradient preset</Label>
              <Select value={selectedPreset} onValueChange={handlePresetChange}>
                <SelectTrigger id="gradient-preset" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRADIENT_PRESETS.map((preset) => (
                    <SelectItem key={preset.name} value={preset.name}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gradient-type">Gradient type</Label>
              <Select
                value={gradientType}
                onValueChange={(v) => setGradientType(v as GradientType)}
              >
                <SelectTrigger id="gradient-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">Linear</SelectItem>
                  <SelectItem value="radial">Radial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gradient-start">Start colour</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={gradientStartColor}
                  onChange={(e) => setGradientStartColor(e.target.value)}
                  className="h-9 w-9 shrink-0 cursor-pointer rounded-md border p-0.5"
                />
                <Input
                  id="gradient-start"
                  value={gradientStartColor}
                  onChange={(e) => setGradientStartColor(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gradient-end">End colour</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={gradientEndColor}
                  onChange={(e) => setGradientEndColor(e.target.value)}
                  className="h-9 w-9 shrink-0 cursor-pointer rounded-md border p-0.5"
                />
                <Input
                  id="gradient-end"
                  value={gradientEndColor}
                  onChange={(e) => setGradientEndColor(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>

            {gradientType === "linear" && (
              <div className="space-y-1.5">
                <Label htmlFor="gradient-angle">Angle (degrees)</Label>
                <Input
                  id="gradient-angle"
                  type="number"
                  min={0}
                  max={360}
                  value={gradientAngle}
                  onChange={(e) =>
                    setGradientAngle(Number(e.target.value) || 0)
                  }
                />
              </div>
            )}
          </div>

          {/* Logo Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Logo</h2>

            <div className="space-y-1.5">
              <Label htmlFor="logo-upload">Upload logo</Label>
              <Input
                ref={fileInputRef}
                id="logo-upload"
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={handleLogoUpload}
              />
            </div>

            {logoImage && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="logo-scale">
                    Scale ({Math.round(logoScale * 100)}%)
                  </Label>
                  <Input
                    id="logo-scale"
                    type="range"
                    min={0.1}
                    max={1.0}
                    step={0.05}
                    value={logoScale}
                    onChange={(e) => setLogoScale(Number(e.target.value))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="logo-x">X position (px)</Label>
                    <Input
                      id="logo-x"
                      type="number"
                      value={logoX}
                      onChange={(e) => setLogoX(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="logo-y">Y position (px)</Label>
                    <Input
                      id="logo-y"
                      type="number"
                      value={logoY}
                      onChange={(e) => setLogoY(Number(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <Button variant="outline" onClick={handleRemoveLogo}>
                  Remove logo
                </Button>
              </>
            )}
          </div>

          {/* Text Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Text</h2>

            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. CalmCompliance"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="title-font-size">Title font size (px)</Label>
              <Input
                id="title-font-size"
                type="number"
                min={12}
                max={120}
                value={titleFontSize}
                onChange={(e) =>
                  setTitleFontSize(Number(e.target.value) || 12)
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input
                id="subtitle"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. Helping facilities say goodbye to spreadsheets"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="subtitle-font-size">Subtitle font size (px)</Label>
              <Input
                id="subtitle-font-size"
                type="number"
                min={12}
                max={80}
                value={subtitleFontSize}
                onChange={(e) =>
                  setSubtitleFontSize(Number(e.target.value) || 12)
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="text-color">Text colour</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="h-9 w-9 shrink-0 cursor-pointer rounded-md border p-0.5"
                />
                <Input
                  id="text-color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="text-alignment">Text alignment</Label>
              <Select
                value={textAlignment}
                onValueChange={(v) => setTextAlignment(v as TextAlignment)}
              >
                <SelectTrigger id="text-alignment" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Centre</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="title-y">Title Y position (px)</Label>
                <Input
                  id="title-y"
                  type="number"
                  value={titleY}
                  onChange={(e) => setTitleY(Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subtitle-y">Subtitle Y position (px)</Label>
                <Input
                  id="subtitle-y"
                  type="number"
                  value={subtitleY}
                  onChange={(e) => setSubtitleY(Number(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right column - Preview */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Preview</h2>

          <div className="relative w-full overflow-auto rounded-lg border p-4">
            <div className="relative" style={{ aspectRatio: `${BANNER_WIDTH} / ${BANNER_HEIGHT}` }}>
              <canvas
                ref={canvasRef}
                className="block w-full h-full"
                style={{ imageRendering: "auto" }}
              />
              {/* Safe zone overlay */}
              <div
                className="absolute left-0 top-0 bottom-0 border-2 border-dashed border-red-500/50 bg-red-500/10 pointer-events-none"
                style={{
                  width: "280px",
                }}
              >
                <div className="absolute bottom-2 left-2 text-xs font-medium text-red-600 dark:text-red-400 bg-white/90 dark:bg-black/90 px-2 py-1 rounded">
                  Profile area
                </div>
              </div>
            </div>
          </div>

          <Button onClick={handleDownload} className="w-full">
            <RiDownload2Line data-icon="inline-start" />
            Download PNG
          </Button>

          <p className="text-muted-foreground text-sm">
            Final size: {BANNER_WIDTH} × {BANNER_HEIGHT} pixels
          </p>
        </div>
      </div>
    </div>
  )
}
