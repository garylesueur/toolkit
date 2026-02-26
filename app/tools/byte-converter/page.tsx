"use client"

import { useState, useCallback, useMemo } from "react"
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
import { RiFileCopyLine, RiCheckLine } from "@remixicon/react"

const COPY_RESET_MS = 2000
const BITS_PER_BYTE = 8

interface UnitDefinition {
  key: string
  label: string
  abbreviation: string
  /** Number of bytes this unit represents. */
  bytes: number
}

const SI_UNITS: ReadonlyArray<UnitDefinition> = [
  { key: "b", label: "Bytes", abbreviation: "B", bytes: 1 },
  { key: "kb", label: "Kilobytes", abbreviation: "KB", bytes: 1000 },
  { key: "mb", label: "Megabytes", abbreviation: "MB", bytes: 1000 ** 2 },
  { key: "gb", label: "Gigabytes", abbreviation: "GB", bytes: 1000 ** 3 },
  { key: "tb", label: "Terabytes", abbreviation: "TB", bytes: 1000 ** 4 },
  { key: "pb", label: "Petabytes", abbreviation: "PB", bytes: 1000 ** 5 },
]

const BINARY_UNITS: ReadonlyArray<UnitDefinition> = [
  { key: "b", label: "Bytes", abbreviation: "B", bytes: 1 },
  { key: "kib", label: "Kibibytes", abbreviation: "KiB", bytes: 1024 },
  { key: "mib", label: "Mebibytes", abbreviation: "MiB", bytes: 1024 ** 2 },
  { key: "gib", label: "Gibibytes", abbreviation: "GiB", bytes: 1024 ** 3 },
  { key: "tib", label: "Tebibytes", abbreviation: "TiB", bytes: 1024 ** 4 },
  { key: "pib", label: "Pebibytes", abbreviation: "PiB", bytes: 1024 ** 5 },
]

/**
 * All selectable input units — SI and binary combined (bytes only once),
 * plus bits.
 */
const INPUT_UNITS: ReadonlyArray<UnitDefinition> = [
  { key: "bits", label: "Bits", abbreviation: "bits", bytes: 1 / BITS_PER_BYTE },
  ...SI_UNITS,
  ...BINARY_UNITS.filter((u) => u.key !== "b"),
]

interface ConvertedRow {
  label: string
  abbreviation: string
  value: string
}

/**
 * Formats a number with reasonable precision, trimming trailing zeros.
 * Uses up to 10 significant digits so very small / large values stay readable.
 */
const MAX_PRECISION = 10

function formatNumber(n: number): string {
  if (n === 0) return "0"
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return n.toLocaleString("en-GB")
  return parseFloat(n.toPrecision(MAX_PRECISION)).toLocaleString("en-GB", {
    maximumFractionDigits: 20,
  })
}

function convertToBytes(value: number, unit: UnitDefinition): number {
  return value * unit.bytes
}

function convertFromBytes(
  bytes: number,
  units: ReadonlyArray<UnitDefinition>,
): ConvertedRow[] {
  return units.map((unit) => ({
    label: unit.label,
    abbreviation: unit.abbreviation,
    value: formatNumber(bytes / unit.bytes),
  }))
}

interface CopyableRowProps {
  label: string
  abbreviation: string
  value: string
  copiedValue: string | null
  onCopy: (value: string) => void
}

function CopyableRow({
  label,
  abbreviation,
  value,
  copiedValue,
  onCopy,
}: CopyableRowProps) {
  const copyText = `${value} ${abbreviation}`
  const isCopied = copiedValue === copyText

  return (
    <div className="flex items-center justify-between gap-4 rounded-md border bg-muted/30 px-3 py-2">
      <div className="min-w-0 flex-1">
        <span className="text-muted-foreground text-xs">
          {label} ({abbreviation})
        </span>
        <p className="truncate font-mono text-sm">{value}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onCopy(copyText)}
        disabled={!value}
      >
        {isCopied ? <RiCheckLine /> : <RiFileCopyLine />}
      </Button>
    </div>
  )
}

export default function ByteConverterPage() {
  const [inputValue, setInputValue] = useState("1")
  const [selectedUnit, setSelectedUnit] = useState("gb")
  const [copiedValue, setCopiedValue] = useState<string | null>(null)

  const handleCopy = useCallback(async (value: string) => {
    await navigator.clipboard.writeText(value)
    setCopiedValue(value)
    setTimeout(() => setCopiedValue(null), COPY_RESET_MS)
  }, [])

  const numericValue = useMemo(() => {
    const parsed = parseFloat(inputValue)
    return Number.isFinite(parsed) ? parsed : null
  }, [inputValue])

  const unit = useMemo(
    () => INPUT_UNITS.find((u) => u.key === selectedUnit) ?? INPUT_UNITS[0],
    [selectedUnit],
  )

  const bytes = useMemo(() => {
    if (numericValue === null) return null
    return convertToBytes(numericValue, unit)
  }, [numericValue, unit])

  const bitsRow: ConvertedRow | null = useMemo(() => {
    if (bytes === null) return null
    return {
      label: "Bits",
      abbreviation: "bits",
      value: formatNumber(bytes * BITS_PER_BYTE),
    }
  }, [bytes])

  const siRows = useMemo(() => {
    if (bytes === null) return null
    return convertFromBytes(bytes, SI_UNITS)
  }, [bytes])

  const binaryRows = useMemo(() => {
    if (bytes === null) return null
    return convertFromBytes(bytes, BINARY_UNITS)
  }, [bytes])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Byte / Bit Size Converter
        </h1>
        <p className="text-muted-foreground mt-1">
          Convert between bytes, kilobytes, megabytes, and more — in both SI and
          binary units.
        </p>
      </div>

      <section className="flex gap-3">
        <div className="flex-1 space-y-2">
          <Label htmlFor="byte-value">Value</Label>
          <Input
            id="byte-value"
            type="text"
            inputMode="decimal"
            placeholder="e.g. 1024"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="font-mono"
          />
        </div>
        <div className="w-40 space-y-2">
          <Label>Unit</Label>
          <Select value={selectedUnit} onValueChange={setSelectedUnit}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INPUT_UNITS.map((u) => (
                <SelectItem key={u.key} value={u.key}>
                  {u.label} ({u.abbreviation})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {bitsRow && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Bits</h2>
          <CopyableRow
            label={bitsRow.label}
            abbreviation={bitsRow.abbreviation}
            value={bitsRow.value}
            copiedValue={copiedValue}
            onCopy={handleCopy}
          />
        </section>
      )}

      {siRows && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">SI Units (base 1000)</h2>
          <div className="space-y-2">
            {siRows.map((row) => (
              <CopyableRow
                key={row.abbreviation}
                label={row.label}
                abbreviation={row.abbreviation}
                value={row.value}
                copiedValue={copiedValue}
                onCopy={handleCopy}
              />
            ))}
          </div>
        </section>
      )}

      {binaryRows && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Binary Units (base 1024)</h2>
          <div className="space-y-2">
            {binaryRows.map((row) => (
              <CopyableRow
                key={row.abbreviation}
                label={row.label}
                abbreviation={row.abbreviation}
                value={row.value}
                copiedValue={copiedValue}
                onCopy={handleCopy}
              />
            ))}
          </div>
        </section>
      )}

      {numericValue === null && inputValue.trim() !== "" && (
        <p className="text-sm text-destructive">
          Invalid number — please enter a valid numeric value.
        </p>
      )}
    </div>
  )
}
