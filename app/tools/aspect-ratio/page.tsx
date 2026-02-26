"use client"

import { useState, useCallback, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CopyableRow } from "@/components/copyable-row"

const COPY_RESET_MS = 2000
const DECIMAL_PRECISION = 3

type DimensionType = "width" | "height"

interface KnownRatio {
  w: number
  h: number
  name: string
}

const KNOWN_RATIOS: ReadonlyArray<KnownRatio> = [
  { w: 1, h: 1, name: "Square" },
  { w: 4, h: 3, name: "Standard" },
  { w: 3, h: 2, name: "Classic Film" },
  { w: 16, h: 9, name: "Widescreen" },
  { w: 16, h: 10, name: "Widescreen (16:10)" },
  { w: 21, h: 9, name: "Ultrawide" },
  { w: 9, h: 16, name: "Vertical Video" },
]

function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b) {
    const t = b
    b = a % b
    a = t
  }
  return a
}

interface SimplifiedRatio {
  w: number
  h: number
}

function simplifyRatio(width: number, height: number): SimplifiedRatio {
  const divisor = gcd(width, height)
  return { w: width / divisor, h: height / divisor }
}

function findKnownRatioName(simplified: SimplifiedRatio): string | null {
  const match = KNOWN_RATIOS.find(
    (r) => r.w === simplified.w && r.h === simplified.h,
  )
  return match?.name ?? null
}

export default function AspectRatioCalculatorPage() {
  const [dimWidth, setDimWidth] = useState("")
  const [dimHeight, setDimHeight] = useState("")

  const [ratioW, setRatioW] = useState("16")
  const [ratioH, setRatioH] = useState("9")
  const [knownDimension, setKnownDimension] = useState("1920")
  const [knownDimensionType, setKnownDimensionType] =
    useState<DimensionType>("width")

  const [copiedValue, setCopiedValue] = useState<string | null>(null)

  const handleCopy = useCallback(async (value: string) => {
    await navigator.clipboard.writeText(value)
    setCopiedValue(value)
    setTimeout(() => setCopiedValue(null), COPY_RESET_MS)
  }, [])

  const parsedWidth = useMemo(() => {
    const n = parseFloat(dimWidth)
    return Number.isFinite(n) && n > 0 ? n : null
  }, [dimWidth])

  const parsedHeight = useMemo(() => {
    const n = parseFloat(dimHeight)
    return Number.isFinite(n) && n > 0 ? n : null
  }, [dimHeight])

  const simplified = useMemo(() => {
    if (parsedWidth === null || parsedHeight === null) return null
    return simplifyRatio(parsedWidth, parsedHeight)
  }, [parsedWidth, parsedHeight])

  const decimalRatio = useMemo(() => {
    if (parsedWidth === null || parsedHeight === null) return null
    return (parsedWidth / parsedHeight).toFixed(DECIMAL_PRECISION)
  }, [parsedWidth, parsedHeight])

  const knownName = useMemo(() => {
    if (!simplified) return null
    return findKnownRatioName(simplified)
  }, [simplified])

  const parsedRatioW = useMemo(() => {
    const n = parseFloat(ratioW)
    return Number.isFinite(n) && n > 0 ? n : null
  }, [ratioW])

  const parsedRatioH = useMemo(() => {
    const n = parseFloat(ratioH)
    return Number.isFinite(n) && n > 0 ? n : null
  }, [ratioH])

  const parsedKnownDimension = useMemo(() => {
    const n = parseFloat(knownDimension)
    return Number.isFinite(n) && n > 0 ? n : null
  }, [knownDimension])

  const calculatedDimension = useMemo(() => {
    if (
      parsedRatioW === null ||
      parsedRatioH === null ||
      parsedKnownDimension === null
    ) {
      return null
    }

    if (knownDimensionType === "width") {
      return (parsedKnownDimension / parsedRatioW) * parsedRatioH
    }
    return (parsedKnownDimension / parsedRatioH) * parsedRatioW
  }, [parsedRatioW, parsedRatioH, parsedKnownDimension, knownDimensionType])

  const calculatedLabel =
    knownDimensionType === "width" ? "Height" : "Width"

  const hasDimInput = dimWidth.trim().length > 0 || dimHeight.trim().length > 0
  const dimInputValid = parsedWidth !== null && parsedHeight !== null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Aspect Ratio Calculator
        </h1>
        <p className="text-muted-foreground mt-1">
          Calculate aspect ratios from dimensions, or find a missing dimension
          from a ratio.
        </p>
      </div>

      {/* Section 1: Dimensions to Ratio */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Dimensions to Ratio</h2>

        <div className="flex gap-3">
          <div className="flex-1 space-y-2">
            <Label htmlFor="dim-width">Width</Label>
            <Input
              id="dim-width"
              type="text"
              inputMode="decimal"
              placeholder="e.g. 1920"
              value={dimWidth}
              onChange={(e) => setDimWidth(e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="flex-1 space-y-2">
            <Label htmlFor="dim-height">Height</Label>
            <Input
              id="dim-height"
              type="text"
              inputMode="decimal"
              placeholder="e.g. 1080"
              value={dimHeight}
              onChange={(e) => setDimHeight(e.target.value)}
              className="font-mono"
            />
          </div>
        </div>

        {hasDimInput && !dimInputValid && (
          <p className="text-sm text-destructive">
            Please enter valid positive numbers for both width and height.
          </p>
        )}

        {simplified && decimalRatio && (
          <div className="space-y-2">
            <CopyableRow
              label="Aspect Ratio"
              value={`${simplified.w}:${simplified.h}`}
              copiedValue={copiedValue}
              onCopy={handleCopy}
            />
            <CopyableRow
              label="Decimal Ratio"
              value={decimalRatio}
              copiedValue={copiedValue}
              onCopy={handleCopy}
            />
            {knownName && (
              <CopyableRow
                label="Common Name"
                value={knownName}
                copiedValue={copiedValue}
                onCopy={handleCopy}
              />
            )}
          </div>
        )}
      </section>

      {/* Section 2: Ratio to Dimension */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Ratio to Dimension</h2>

        <div className="flex gap-3">
          <div className="flex-1 space-y-2">
            <Label htmlFor="ratio-w">Ratio Width</Label>
            <Input
              id="ratio-w"
              type="text"
              inputMode="decimal"
              placeholder="e.g. 16"
              value={ratioW}
              onChange={(e) => setRatioW(e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="flex-1 space-y-2">
            <Label htmlFor="ratio-h">Ratio Height</Label>
            <Input
              id="ratio-h"
              type="text"
              inputMode="decimal"
              placeholder="e.g. 9"
              value={ratioH}
              onChange={(e) => setRatioH(e.target.value)}
              className="font-mono"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 space-y-2">
            <Label htmlFor="known-dim">Known Dimension</Label>
            <Input
              id="known-dim"
              type="text"
              inputMode="decimal"
              placeholder="e.g. 1920"
              value={knownDimension}
              onChange={(e) => setKnownDimension(e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="w-40 space-y-2">
            <Label htmlFor="dim-type-select">Dimension Is</Label>
            <Select
              value={knownDimensionType}
              onValueChange={(v) => setKnownDimensionType(v as DimensionType)}
            >
              <SelectTrigger id="dim-type-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="width">Width</SelectItem>
                <SelectItem value="height">Height</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {calculatedDimension !== null && (
          <div className="space-y-2">
            <CopyableRow
              label={`Calculated ${calculatedLabel}`}
              value={
                Number.isInteger(calculatedDimension)
                  ? String(calculatedDimension)
                  : calculatedDimension.toFixed(DECIMAL_PRECISION)
              }
              copiedValue={copiedValue}
              onCopy={handleCopy}
            />
          </div>
        )}
      </section>
    </div>
  )
}
