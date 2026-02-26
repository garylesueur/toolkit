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

type NumberBase = "decimal" | "hexadecimal" | "octal" | "binary"

interface BaseOption {
  value: NumberBase
  label: string
  prefix: string
  radix: number
}

const BASE_OPTIONS: BaseOption[] = [
  { value: "decimal", label: "Decimal", prefix: "", radix: 10 },
  { value: "hexadecimal", label: "Hexadecimal", prefix: "0x", radix: 16 },
  { value: "octal", label: "Octal", prefix: "0o", radix: 8 },
  { value: "binary", label: "Binary", prefix: "0b", radix: 2 },
]

const BIGINT_PREFIX: Record<NumberBase, string> = {
  decimal: "",
  hexadecimal: "0x",
  octal: "0o",
  binary: "0b",
}

/** Valid digit characters for each base, indexed by radix. */
const VALID_CHARS: Record<number, string> = {
  2: "01",
  8: "01234567",
  10: "0123456789",
  16: "0123456789abcdef",
}

interface ParseResult {
  value: bigint | null
  error: string | null
}

/**
 * Strips common base prefixes (0x, 0o, 0b) from the input and validates
 * that every remaining character is legal for the chosen base.
 */
function parseInput(raw: string, base: NumberBase): ParseResult {
  const cleaned = raw.trim().toLowerCase()
  if (!cleaned) return { value: null, error: null }

  let normalized = cleaned
  if (base === "hexadecimal") normalized = normalized.replace(/^0x/, "")
  if (base === "octal") normalized = normalized.replace(/^0o/, "")
  if (base === "binary") normalized = normalized.replace(/^0b/, "")

  if (!normalized) return { value: null, error: null }

  const option = BASE_OPTIONS.find((o) => o.value === base)
  if (!option) return { value: null, error: "Unknown base." }

  const allowed = VALID_CHARS[option.radix]
  for (const char of normalized) {
    if (!allowed.includes(char)) {
      return {
        value: null,
        error: `Invalid character "${char}" for ${base}.`,
      }
    }
  }

  try {
    const prefix = BIGINT_PREFIX[base]
    const value = BigInt(`${prefix}${normalized}`)
    return { value, error: null }
  } catch {
    return { value: null, error: "Could not parse the input as a number." }
  }
}

interface FormatResult {
  label: string
  display: string
}

function formatAllBases(value: bigint): FormatResult[] {
  return BASE_OPTIONS.map((option) => {
    const raw = value.toString(option.radix)
    const formatted = option.radix === 16 ? raw.toUpperCase() : raw
    const display = option.prefix ? `${option.prefix}${formatted}` : formatted
    return { label: option.label, display }
  })
}

export default function NumberBaseConverterPage() {
  const [input, setInput] = useState("")
  const [base, setBase] = useState<NumberBase>("decimal")
  const [copiedValue, setCopiedValue] = useState<string | null>(null)

  const { value, error } = useMemo(() => parseInput(input, base), [input, base])
  const results = useMemo(
    () => (value !== null ? formatAllBases(value) : null),
    [value],
  )

  const handleCopy = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedValue(text)
    setTimeout(() => setCopiedValue(null), COPY_RESET_MS)
  }, [])

  const hasInput = input.trim().length > 0

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        Number Base Converter
      </h1>
      <p className="text-muted-foreground mt-1">
        Convert numbers between decimal, hexadecimal, octal, and binary.
        Supports large integers.
      </p>

      <div className="mt-8 flex gap-3">
        <div className="flex-1 space-y-2">
          <Label htmlFor="number-input">Number</Label>
          <Input
            id="number-input"
            placeholder="e.g. 255, 0xFF, 0b11111111"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="font-mono"
          />
        </div>
        <div className="w-40 space-y-2">
          <Label htmlFor="base-select">Input base</Label>
          <Select
            value={base}
            onValueChange={(v) => setBase(v as NumberBase)}
          >
            <SelectTrigger id="base-select" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BASE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {hasInput && error && (
        <p className="mt-4 text-sm text-destructive">{error}</p>
      )}

      {results && (
        <div className="mt-6 space-y-2">
          {results.map((result) => (
            <CopyableRow
              key={result.label}
              label={result.label}
              value={result.display}
              copiedValue={copiedValue}
              onCopy={handleCopy}
            />
          ))}
        </div>
      )}
    </div>
  )
}
