"use client"

import { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { RiFileCopyLine, RiCheckLine } from "@remixicon/react"

const COPY_RESET_MS = 2000

/**
 * Matches 13-digit (millisecond) or 10-digit (second) numeric sequences
 * on word boundaries so embedded numbers in longer strings are ignored.
 */
const EPOCH_PATTERN = /\b(\d{13}|\d{10})\b/g

/** Minimum 10-digit epoch in seconds: 2001-09-09T01:46:40Z */
const MIN_EPOCH_SECONDS = 1_000_000_000

/** Maximum 10-digit epoch in seconds: 2286-11-20T17:46:39Z */
const MAX_EPOCH_SECONDS = 9_999_999_999

const MS_PER_SECOND = 1000

interface ConversionResult {
  output: string
  count: number
}

/**
 * Returns `true` when the numeric value falls within a plausible
 * Unix-epoch range (seconds or milliseconds).
 */
function isPlausibleEpoch(value: number, digitCount: number): boolean {
  if (digitCount === 13) {
    const seconds = value / MS_PER_SECOND
    return seconds >= MIN_EPOCH_SECONDS && seconds <= MAX_EPOCH_SECONDS
  }
  return value >= MIN_EPOCH_SECONDS && value <= MAX_EPOCH_SECONDS
}

function convertEpochs(text: string): ConversionResult {
  let count = 0

  const output = text.replace(EPOCH_PATTERN, (match) => {
    const value = Number(match)
    const digitCount = match.length

    if (!isPlausibleEpoch(value, digitCount)) {
      return match
    }

    const ms = digitCount === 13 ? value : value * MS_PER_SECOND
    const date = new Date(ms)

    if (Number.isNaN(date.getTime())) {
      return match
    }

    count++
    return `${match} (${date.toISOString()})`
  })

  return { output, count }
}

export default function EpochBatchConverterPage() {
  const [input, setInput] = useState("")
  const [copied, setCopied] = useState(false)

  const { output, count } = useMemo(() => convertEpochs(input), [input])

  const handleCopy = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), COPY_RESET_MS)
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        Epoch Batch Converter
      </h1>
      <p className="text-muted-foreground mt-1">
        Paste text containing Unix timestamps and see them converted to
        human-readable dates inline.
      </p>

      <div className="mt-8 space-y-4">
        <Textarea
          placeholder="Paste log files, JSON, database dumps, or any text containing Unix timestamps…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="min-h-40 resize-y font-mono text-sm"
        />

        <div>
          <Textarea
            placeholder="Converted output will appear here…"
            value={output}
            readOnly
            className="min-h-40 resize-y bg-muted/50 font-mono text-sm"
          />

          <div className="mt-2 flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy(output)}
              disabled={!output}
            >
              {copied ? (
                <RiCheckLine data-icon="inline-start" />
              ) : (
                <RiFileCopyLine data-icon="inline-start" />
              )}
              {copied ? "Copied" : "Copy result"}
            </Button>

            {count > 0 && (
              <span className="text-muted-foreground text-sm">
                {count} {count === 1 ? "timestamp" : "timestamps"} converted
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
