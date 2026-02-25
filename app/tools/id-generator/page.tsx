"use client"

import { useState, useEffect, useCallback } from "react"
import { shortId } from "@/lib/shared/id"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RiRefreshLine, RiFileCopyLine, RiCheckLine } from "@remixicon/react"

const NANOID_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"

const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

type IdEntry = {
  format: string
  value: string
}

/** Generates a NanoID-style string with configurable length (default 21). */
function nanoId(length = 21): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  let result = ""
  for (const byte of bytes) {
    result += NANOID_ALPHABET[byte % NANOID_ALPHABET.length]
  }
  return result
}

/** Encodes a buffer to Crockford Base32 (used for ULID). */
function encodeCrockfordBase32(buffer: Uint8Array): string {
  const alphabet = CROCKFORD_BASE32
  let result = ""
  let bits = 0
  let value = 0

  for (const byte of buffer) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      bits -= 5
      result += alphabet[(value >>> bits) & 31]
    }
  }
  if (bits > 0) {
    result += alphabet[(value << (5 - bits)) & 31]
  }
  return result
}

/** Generates a ULID: 10 chars timestamp + 16 chars random, Crockford Base32. */
function ulid(): string {
  const timestamp = Date.now()
  const timestampBytes = new Uint8Array(6)
  timestampBytes[0] = (timestamp >>> 40) & 0xff
  timestampBytes[1] = (timestamp >>> 32) & 0xff
  timestampBytes[2] = (timestamp >>> 24) & 0xff
  timestampBytes[3] = (timestamp >>> 16) & 0xff
  timestampBytes[4] = (timestamp >>> 8) & 0xff
  timestampBytes[5] = timestamp & 0xff

  const randomBytes = crypto.getRandomValues(new Uint8Array(10))
  const timePart = encodeCrockfordBase32(timestampBytes).padStart(10, "0").slice(-10)
  const randomPart = encodeCrockfordBase32(randomBytes).padStart(16, "0").slice(-16)

  return timePart + randomPart
}

function generateAll(): IdEntry[] {
  return [
    { format: "UUID", value: crypto.randomUUID() },
    { format: "Short ID", value: shortId(12) },
    { format: "NanoID", value: nanoId(21) },
    { format: "ULID", value: ulid() },
  ]
}

const COPY_FEEDBACK_MS = 2000

export default function IdGeneratorPage() {
  const [ids, setIds] = useState<IdEntry[]>([])
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null)

  const regenerate = useCallback(() => {
    setIds(generateAll())
  }, [])

  useEffect(() => {
    regenerate()
  }, [regenerate])

  const handleCopy = useCallback(
    async (entry: IdEntry) => {
      await navigator.clipboard.writeText(entry.value)
      setCopiedFormat(entry.format)
      setTimeout(() => setCopiedFormat(null), COPY_FEEDBACK_MS)
    },
    [],
  )

  const handleRowClick = useCallback(
    (entry: IdEntry) => {
      void handleCopy(entry)
    },
    [handleCopy],
  )

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ID Generator</h1>
          <p className="text-muted-foreground mt-1">
            Generate unique identifiers in various formats. Click any value to
            copy it.
          </p>
        </div>
        <Button variant="outline" onClick={regenerate}>
          <RiRefreshLine data-icon="inline-start" />
          Regenerate all
        </Button>
      </div>

      <div className="mt-8 space-y-3">
        {ids.map((entry) => {
          const isCopied = copiedFormat === entry.format
          return (
            <div
              key={entry.format}
              role="button"
              tabIndex={0}
              onClick={() => handleRowClick(entry)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  handleRowClick(entry)
                }
              }}
              className="flex cursor-pointer items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Badge variant="secondary">{entry.format}</Badge>
              <code className="min-w-0 flex-1 truncate font-mono text-sm">
                {entry.value}
              </code>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                  e.stopPropagation()
                  void handleCopy(entry)
                }}
                aria-label={isCopied ? "Copied" : `Copy ${entry.format}`}
              >
                {isCopied ? (
                  <RiCheckLine className="size-4 text-green-600 dark:text-green-500" />
                ) : (
                  <RiFileCopyLine className="size-4" />
                )}
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
