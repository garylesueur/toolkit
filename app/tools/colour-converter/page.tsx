"use client"

import { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RiFileCopyLine, RiCheckLine } from "@remixicon/react"
import { parseColour } from "@/lib/colour/parse"
import { toAllFormats, rgbToHex } from "@/lib/colour/convert"

const COPY_RESET_MS = 2000

interface FormatRowProps {
  label: string
  value: string
  copiedValue: string | null
  onCopy: (value: string) => void
}

function FormatRow({ label, value, copiedValue, onCopy }: FormatRowProps) {
  const isCopied = copiedValue === value

  return (
    <div className="flex items-center justify-between gap-4 rounded-md border bg-muted/30 px-3 py-2">
      <div className="min-w-0 flex-1">
        <span className="text-muted-foreground text-xs">{label}</span>
        <p className="truncate font-mono text-sm">{value}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onCopy(value)}
      >
        {isCopied ? <RiCheckLine /> : <RiFileCopyLine />}
      </Button>
    </div>
  )
}

const FORMAT_LABELS: { key: "hex" | "rgb" | "hsl"; label: string }[] = [
  { key: "hex", label: "Hex" },
  { key: "rgb", label: "RGB" },
  { key: "hsl", label: "HSL" },
]

export default function ColourConverterPage() {
  const [input, setInput] = useState("")
  const [copiedValue, setCopiedValue] = useState<string | null>(null)

  const rgb = useMemo(() => parseColour(input), [input])
  const formats = useMemo(() => (rgb ? toAllFormats(rgb) : null), [rgb])
  const swatchColour = useMemo(() => (rgb ? rgbToHex(rgb) : null), [rgb])

  const handleCopy = useCallback(async (value: string) => {
    await navigator.clipboard.writeText(value)
    setCopiedValue(value)
    setTimeout(() => setCopiedValue(null), COPY_RESET_MS)
  }, [])

  const hasInput = input.trim().length > 0
  const isInvalid = hasInput && !rgb

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Colour Converter</h1>
      <p className="text-muted-foreground mt-1">
        Enter a colour in hex, RGB, or HSL and see all representations.
      </p>

      <div className="mt-8">
        <label htmlFor="colour-input" className="sr-only">
          Colour input
        </label>
        <Input
          id="colour-input"
          placeholder="e.g. #3b82f6, rgb(59, 130, 246), hsl(217, 91%, 60%)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="font-mono"
        />
      </div>

      {isInvalid && (
        <p className="mt-4 text-sm text-destructive">
          Unrecognised colour format. Try hex, rgb(), or hsl().
        </p>
      )}

      {formats && swatchColour && (
        <div className="mt-6 space-y-4">
          <div
            className="h-20 rounded-lg border"
            style={{ backgroundColor: swatchColour }}
          />

          {FORMAT_LABELS.map(({ key, label }) => (
            <FormatRow
              key={key}
              label={label}
              value={formats[key]}
              copiedValue={copiedValue}
              onCopy={handleCopy}
            />
          ))}
        </div>
      )}
    </div>
  )
}
