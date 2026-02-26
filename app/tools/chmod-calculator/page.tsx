"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RiFileCopyLine, RiCheckLine } from "@remixicon/react"

const COPY_RESET_MS = 2000

const READ = 4
const WRITE = 2
const EXECUTE = 1

const NUMERIC_PATTERN = /^[0-7]{3}$/

type EntityLabel = "Owner" | "Group" | "Other"

interface PermissionEntity {
  label: EntityLabel
  index: number
}

const ENTITIES: ReadonlyArray<PermissionEntity> = [
  { label: "Owner", index: 0 },
  { label: "Group", index: 1 },
  { label: "Other", index: 2 },
]

interface PermissionBit {
  label: string
  symbol: string
  value: number
}

const PERMISSION_BITS: ReadonlyArray<PermissionBit> = [
  { label: "Read", symbol: "r", value: READ },
  { label: "Write", symbol: "w", value: WRITE },
  { label: "Execute", symbol: "x", value: EXECUTE },
]

/** Permissions as a 3-element tuple: [owner, group, other], each 0–7. */
type PermissionTriple = [number, number, number]

interface CommonPattern {
  numeric: string
  description: string
}

const COMMON_PATTERNS: ReadonlyArray<CommonPattern> = [
  { numeric: "777", description: "Everyone: full access" },
  { numeric: "755", description: "Owner: full — Group & Other: read + execute" },
  { numeric: "750", description: "Owner: full — Group: read + execute — Other: none" },
  { numeric: "700", description: "Owner: full — Group & Other: none" },
  { numeric: "666", description: "Everyone: read + write" },
  { numeric: "644", description: "Owner: read + write — Group & Other: read only" },
  { numeric: "640", description: "Owner: read + write — Group: read only — Other: none" },
  { numeric: "600", description: "Owner: read + write — Group & Other: none" },
  { numeric: "555", description: "Everyone: read + execute" },
  { numeric: "444", description: "Everyone: read only" },
  { numeric: "400", description: "Owner: read only — Group & Other: none" },
]

function entityToSymbolic(value: number): string {
  const r = value & READ ? "r" : "-"
  const w = value & WRITE ? "w" : "-"
  const x = value & EXECUTE ? "x" : "-"
  return `${r}${w}${x}`
}

function permissionsToSymbolic(perms: PermissionTriple): string {
  return perms.map(entityToSymbolic).join("")
}

function permissionsToNumeric(perms: PermissionTriple): string {
  return perms.join("")
}

function parseNumericInput(input: string): PermissionTriple | null {
  if (!NUMERIC_PATTERN.test(input)) return null
  return [
    Number(input[0]),
    Number(input[1]),
    Number(input[2]),
  ]
}

function findCommonPattern(numeric: string): string | null {
  const match = COMMON_PATTERNS.find((p) => p.numeric === numeric)
  return match?.description ?? null
}

interface CopyableRowProps {
  label: string
  value: string
  copiedKey: string | null
  copyKey: string
  onCopy: (key: string, text: string) => void
}

function CopyableRow({
  label,
  value,
  copiedKey,
  copyKey,
  onCopy,
}: CopyableRowProps) {
  const isCopied = copiedKey === copyKey

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
        onClick={() => onCopy(copyKey, value)}
      >
        {isCopied ? <RiCheckLine /> : <RiFileCopyLine />}
      </Button>
    </div>
  )
}

const DEFAULT_PERMISSIONS: PermissionTriple = [7, 5, 5]

export default function ChmodCalculatorPage() {
  const [permissions, setPermissions] = useState<PermissionTriple>(DEFAULT_PERMISSIONS)
  const [numericInput, setNumericInput] = useState(
    permissionsToNumeric(DEFAULT_PERMISSIONS),
  )
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const handleCopy = useCallback(async (key: string, text: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), COPY_RESET_MS)
  }, [])

  const toggleBit = useCallback(
    (entityIndex: number, bitValue: number) => {
      setPermissions((prev) => {
        const next: PermissionTriple = [...prev]
        next[entityIndex] = prev[entityIndex] ^ bitValue
        const numeric = permissionsToNumeric(next)
        setNumericInput(numeric)
        return next
      })
    },
    [],
  )

  const handleNumericChange = useCallback((value: string) => {
    setNumericInput(value)
    const parsed = parseNumericInput(value)
    if (parsed) {
      setPermissions(parsed)
    }
  }, [])

  const numericStr = permissionsToNumeric(permissions)
  const symbolic = permissionsToSymbolic(permissions)
  const octalStr = `0${numericStr}`
  const commonDescription = findCommonPattern(numericStr)
  const isInputValid = NUMERIC_PATTERN.test(numericInput) || numericInput === ""

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Chmod Calculator
        </h1>
        <p className="text-muted-foreground mt-1">
          Toggle permissions or enter a number to see the chmod breakdown.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Permissions</h2>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-2 text-left font-medium" />
                {PERMISSION_BITS.map((bit) => (
                  <th
                    key={bit.symbol}
                    className="px-4 py-2 text-center font-medium"
                  >
                    {bit.label} ({bit.symbol})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ENTITIES.map((entity) => (
                <tr key={entity.label} className="border-b last:border-b-0">
                  <td className="px-4 py-2 font-medium">{entity.label}</td>
                  {PERMISSION_BITS.map((bit) => {
                    const isSet =
                      (permissions[entity.index] & bit.value) !== 0
                    return (
                      <td key={bit.symbol} className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={isSet}
                          onChange={() => toggleBit(entity.index, bit.value)}
                          className="size-4 rounded border-border accent-primary"
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="max-w-xs space-y-2">
        <Label htmlFor="chmod-numeric">Numeric value</Label>
        <Input
          id="chmod-numeric"
          type="text"
          inputMode="numeric"
          maxLength={3}
          placeholder="e.g. 755"
          value={numericInput}
          onChange={(e) => handleNumericChange(e.target.value)}
          className="font-mono"
        />
        {!isInputValid && (
          <p className="text-sm text-destructive">
            Must be 3 digits, each 0–7.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Results</h2>
        <div className="space-y-2">
          <CopyableRow
            label="Numeric"
            value={numericStr}
            copiedKey={copiedKey}
            copyKey="numeric"
            onCopy={handleCopy}
          />
          <CopyableRow
            label="Symbolic"
            value={symbolic}
            copiedKey={copiedKey}
            copyKey="symbolic"
            onCopy={handleCopy}
          />
          <CopyableRow
            label="Octal (with leading zero)"
            value={octalStr}
            copiedKey={copiedKey}
            copyKey="octal"
            onCopy={handleCopy}
          />
        </div>
        {commonDescription && (
          <p className="text-muted-foreground text-sm">
            <span className="font-mono font-medium text-foreground">
              {numericStr}
            </span>{" "}
            — {commonDescription}
          </p>
        )}
      </section>
    </div>
  )
}
