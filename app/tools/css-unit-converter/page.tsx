"use client"

import { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RiFileCopyLine, RiCheckLine } from "@remixicon/react"
import {
  convertCssUnit,
  formatValue,
  CSS_UNITS,
  DEFAULT_CONFIG,
} from "@/lib/css-units/convert"
import type { CssUnit, ConversionConfig } from "@/lib/css-units/convert"

const COPY_RESET_MS = 2000

interface ResultRowProps {
  unit: CssUnit
  value: string
  copiedValue: string | null
  onCopy: (value: string) => void
}

function ResultRow({ unit, value, copiedValue, onCopy }: ResultRowProps) {
  const display = `${value}${unit}`
  const isCopied = copiedValue === display

  return (
    <div className="flex items-center justify-between gap-4 rounded-md border bg-muted/30 px-3 py-2">
      <div className="min-w-0 flex-1">
        <span className="text-muted-foreground text-xs">{unit}</span>
        <p className="truncate font-mono text-sm">{display}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onCopy(display)}
      >
        {isCopied ? <RiCheckLine /> : <RiFileCopyLine />}
      </Button>
    </div>
  )
}

export default function CssUnitConverterPage() {
  const [inputValue, setInputValue] = useState("16")
  const [sourceUnit, setSourceUnit] = useState<CssUnit>("px")
  const [config, setConfig] = useState<ConversionConfig>(DEFAULT_CONFIG)
  const [copiedValue, setCopiedValue] = useState<string | null>(null)

  const numericValue = useMemo(() => {
    const parsed = parseFloat(inputValue)
    return Number.isFinite(parsed) ? parsed : null
  }, [inputValue])

  const results = useMemo(() => {
    if (numericValue === null) return null
    return convertCssUnit(numericValue, sourceUnit, config)
  }, [numericValue, sourceUnit, config])

  const handleCopy = useCallback(async (value: string) => {
    await navigator.clipboard.writeText(value)
    setCopiedValue(value)
    setTimeout(() => setCopiedValue(null), COPY_RESET_MS)
  }, [])

  const updateConfig = (key: keyof ConversionConfig, raw: string) => {
    const parsed = parseFloat(raw)
    if (Number.isFinite(parsed) && parsed > 0) {
      setConfig((prev) => ({ ...prev, [key]: parsed }))
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        CSS Unit Converter
      </h1>
      <p className="text-muted-foreground mt-1">
        Convert between px, rem, em, vh, and vw.
      </p>

      <div className="mt-8 space-y-6">
        <div className="flex gap-3">
          <div className="flex-1 space-y-2">
            <Label htmlFor="css-value">Value</Label>
            <Input
              id="css-value"
              type="text"
              inputMode="decimal"
              placeholder="e.g. 16"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="w-28 space-y-2">
            <Label htmlFor="css-unit">Unit</Label>
            <select
              id="css-unit"
              value={sourceUnit}
              onChange={(e) => setSourceUnit(e.target.value as CssUnit)}
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs"
            >
              {CSS_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="base-font-size">Base font size (px)</Label>
            <Input
              id="base-font-size"
              type="text"
              inputMode="decimal"
              defaultValue={DEFAULT_CONFIG.baseFontSize}
              onChange={(e) => updateConfig("baseFontSize", e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="viewport-width">Viewport width (px)</Label>
            <Input
              id="viewport-width"
              type="text"
              inputMode="decimal"
              defaultValue={DEFAULT_CONFIG.viewportWidth}
              onChange={(e) => updateConfig("viewportWidth", e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="viewport-height">Viewport height (px)</Label>
            <Input
              id="viewport-height"
              type="text"
              inputMode="decimal"
              defaultValue={DEFAULT_CONFIG.viewportHeight}
              onChange={(e) => updateConfig("viewportHeight", e.target.value)}
              className="font-mono"
            />
          </div>
        </div>
      </div>

      {results && (
        <div className="mt-6 space-y-2">
          {CSS_UNITS.map((unit) => (
            <ResultRow
              key={unit}
              unit={unit}
              value={formatValue(results[unit])}
              copiedValue={copiedValue}
              onCopy={handleCopy}
            />
          ))}
        </div>
      )}
    </div>
  )
}
