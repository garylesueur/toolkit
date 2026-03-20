"use client"

import { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { RiSwapLine } from "@remixicon/react"
import { rgbToHex } from "@/lib/colour/convert"
import { parseColour } from "@/lib/colour/parse"
import {
  analyseContrast,
  formatRatio,
} from "@/lib/wcag-contrast/contrast"

interface RequirementRowProps {
  label: string
  threshold: string
  pass: boolean
}

function RequirementRow({ label, threshold, pass }: RequirementRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border bg-muted/30 px-3 py-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted-foreground text-xs">{threshold}</p>
      </div>
      <Badge variant={pass ? "default" : "destructive"}>
        {pass ? "Pass" : "Fail"}
      </Badge>
    </div>
  )
}

const FOREGROUND_PICKER_FALLBACK = "#1e293b"
const BACKGROUND_PICKER_FALLBACK = "#ffffff"

interface ColourFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  pickerFallback: string
  pickerAriaLabel: string
}

/**
 * Text field (hex, rgb, hsl) plus a native colour picker. The picker shows the
 * parsed sRGB of the text when valid; otherwise it shows the fallback swatch.
 */
function ColourField({
  id,
  label,
  value,
  onChange,
  placeholder,
  pickerFallback,
  pickerAriaLabel,
}: ColourFieldProps) {
  const parsed = parseColour(value)
  const pickerValue = parsed ? rgbToHex(parsed) : pickerFallback

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          type="color"
          aria-label={pickerAriaLabel}
          value={pickerValue}
          onChange={(e) => onChange(e.target.value)}
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-14 shrink-0 cursor-pointer rounded-md border bg-transparent p-1 shadow-xs transition-[color,box-shadow] focus-visible:ring-3 md:w-16"
        />
        <Input
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 font-mono"
        />
      </div>
    </div>
  )
}

export default function ContrastCheckerPage() {
  const [foreground, setForeground] = useState("#1e293b")
  const [background, setBackground] = useState("#ffffff")

  const result = useMemo(
    () => analyseContrast(foreground, background),
    [foreground, background],
  )

  const handleSwap = useCallback(() => {
    setForeground(background)
    setBackground(foreground)
  }, [foreground, background])

  const fgHex = result ? rgbToHex(result.foreground) : null
  const bgHex = result ? rgbToHex(result.background) : null

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">WCAG Contrast Checker</h1>
      <p className="text-muted-foreground mt-1">
        Use the colour pickers or type hex, rgb(), or hsl() for text and
        background to see the contrast ratio and WCAG 2.1 AA / AAA pass or fail.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <ColourField
          id="fg-colour"
          label="Text (foreground)"
          value={foreground}
          onChange={setForeground}
          placeholder="e.g. #1e293b"
          pickerFallback={FOREGROUND_PICKER_FALLBACK}
          pickerAriaLabel="Pick foreground colour"
        />
        <ColourField
          id="bg-colour"
          label="Background"
          value={background}
          onChange={setBackground}
          placeholder="e.g. #ffffff"
          pickerFallback={BACKGROUND_PICKER_FALLBACK}
          pickerAriaLabel="Pick background colour"
        />
      </div>

      <div className="mt-4">
        <Button type="button" variant="outline" size="sm" onClick={handleSwap}>
          <RiSwapLine data-icon="inline-start" />
          Swap colours
        </Button>
      </div>

      {result ? (
        <>
          <div
            className="mt-8 rounded-lg border p-8 text-center"
            style={{
              backgroundColor: bgHex ?? undefined,
              color: fgHex ?? undefined,
            }}
          >
            <p className="text-lg font-semibold">Sample heading text</p>
            <p className="mt-2 text-sm opacity-90">
              Body text at normal size — WCAG uses 18pt+ regular or 14pt+ bold as
              &quot;large&quot; text for the relaxed thresholds.
            </p>
          </div>

          <div className="mt-8 rounded-lg border bg-muted/20 p-6">
            <p className="text-muted-foreground text-sm">Contrast ratio</p>
            <p className="font-mono text-3xl font-bold tracking-tight">
              {formatRatio(result.ratio)}
            </p>
          </div>

          <div className="mt-6 space-y-2">
            <h2 className="text-sm font-semibold tracking-tight">
              WCAG 2.1 requirements
            </h2>
            <RequirementRow
              label="AA — normal text"
              threshold="Minimum 4.5:1"
              pass={result.compliance.aaNormal}
            />
            <RequirementRow
              label="AA — large text"
              threshold="Minimum 3:1"
              pass={result.compliance.aaLarge}
            />
            <RequirementRow
              label="AAA — normal text"
              threshold="Minimum 7:1"
              pass={result.compliance.aaaNormal}
            />
            <RequirementRow
              label="AAA — large text"
              threshold="Minimum 4.5:1"
              pass={result.compliance.aaaLarge}
            />
          </div>
        </>
      ) : (
        <p className="text-destructive mt-8 text-sm">
          Enter valid colours for both fields (hex, rgb(), or hsl()).
        </p>
      )}
    </div>
  )
}
