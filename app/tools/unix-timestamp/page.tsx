"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RiTimeLine, RiFileCopyLine, RiCheckLine } from "@remixicon/react"
import { formatDateTime, formatRelative } from "@/lib/shared/date"

const COPY_RESET_MS = 2000
const SECONDS_THRESHOLD = 10_000_000_000

/** Timestamp in seconds > this is treated as milliseconds. */
function toMilliseconds(value: number): number {
  return value < SECONDS_THRESHOLD ? value * 1000 : value
}

function formatDateTimeLocalForInput(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

interface CopyableRowProps {
  label: string
  value: string
  copiedValue: string | null
  onCopy: (value: string) => void
}

function CopyableRow({ label, value, copiedValue, onCopy }: CopyableRowProps) {
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
        disabled={!value}
      >
        {isCopied ? <RiCheckLine /> : <RiFileCopyLine />}
      </Button>
    </div>
  )
}

export default function UnixTimestampPage() {
  const [timestampInput, setTimestampInput] = useState("")
  const [dateInput, setDateInput] = useState("")
  const [copiedValue, setCopiedValue] = useState<string | null>(null)

  const handleCopy = useCallback(async (value: string) => {
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopiedValue(value)
    setTimeout(() => setCopiedValue(null), COPY_RESET_MS)
  }, [])

  const handleTimestampNow = useCallback(() => {
    setTimestampInput(Math.floor(Date.now() / 1000).toString())
  }, [])

  const handleDateNow = useCallback(() => {
    setDateInput(formatDateTimeLocalForInput(new Date()))
  }, [])

  const timestampNum = timestampInput.trim() ? Number(timestampInput.trim()) : null
  const timestampMs =
    timestampNum !== null && Number.isFinite(timestampNum)
      ? toMilliseconds(timestampNum)
      : null
  const timestampDate =
    timestampMs !== null ? new Date(timestampMs) : null
  const isInvalidDate =
    timestampDate !== null && Number.isNaN(timestampDate.getTime())

  const dateTs =
    dateInput.trim() !== "" ? new Date(dateInput).getTime() : NaN
  const isInvalidDateInput =
    dateInput.trim() !== "" && Number.isNaN(dateTs)

  const timestampResults =
    timestampDate !== null && !isInvalidDate
      ? {
          iso: timestampDate.toISOString(),
          local: formatDateTime(timestampDate),
          relative: formatRelative(timestampDate),
          utc: timestampDate.toUTCString(),
        }
      : null

  const dateResults =
    dateInput.trim() !== "" &&
    !Number.isNaN(dateTs)
      ? {
          seconds: Math.floor(dateTs / 1000).toString(),
          milliseconds: dateTs.toString(),
        }
      : null

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Unix Timestamp Converter
        </h1>
        <p className="text-muted-foreground mt-1">
          Convert between Unix timestamps and human-readable dates.
        </p>
      </div>

      {/* Section 1: Timestamp to Date */}
      <section>
        <h2 className="text-lg font-semibold">Timestamp to Date</h2>
        <div className="mt-4 flex gap-2">
          <div className="flex-1 space-y-2">
            <Label htmlFor="timestamp-input">Unix timestamp</Label>
            <Input
              id="timestamp-input"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 1708862400 or 1708862400000"
              value={timestampInput}
              onChange={(e) => setTimestampInput(e.target.value)}
            />
          </div>
          <div className="flex shrink-0 items-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleTimestampNow}
            >
              <RiTimeLine data-icon="inline-start" />
              Now
            </Button>
          </div>
        </div>

        {isInvalidDate && timestampInput.trim() !== "" && (
          <p className="mt-2 text-sm text-destructive">
            Invalid timestamp — could not parse date.
          </p>
        )}

        {timestampResults && (
          <div className="mt-4 space-y-2">
            <CopyableRow
              label="ISO 8601"
              value={timestampResults.iso}
              copiedValue={copiedValue}
              onCopy={handleCopy}
            />
            <CopyableRow
              label="Local date/time"
              value={timestampResults.local}
              copiedValue={copiedValue}
              onCopy={handleCopy}
            />
            <CopyableRow
              label="Relative"
              value={timestampResults.relative}
              copiedValue={copiedValue}
              onCopy={handleCopy}
            />
            <CopyableRow
              label="UTC"
              value={timestampResults.utc}
              copiedValue={copiedValue}
              onCopy={handleCopy}
            />
          </div>
        )}
      </section>

      {/* Section 2: Date to Timestamp */}
      <section>
        <h2 className="text-lg font-semibold">Date to Timestamp</h2>
        <div className="mt-4 flex gap-2">
          <div className="flex-1 space-y-2">
            <Label htmlFor="date-input">Date and time</Label>
            <Input
              id="date-input"
              type="datetime-local"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
            />
          </div>
          <div className="flex shrink-0 items-end">
            <Button type="button" variant="outline" onClick={handleDateNow}>
              <RiTimeLine data-icon="inline-start" />
              Now
            </Button>
          </div>
        </div>

        {isInvalidDateInput && (
          <p className="mt-2 text-sm text-destructive">
            Invalid date — could not parse.
          </p>
        )}

        {dateResults && (
          <div className="mt-4 space-y-2">
            <CopyableRow
              label="Unix timestamp (seconds)"
              value={dateResults.seconds}
              copiedValue={copiedValue}
              onCopy={handleCopy}
            />
            <CopyableRow
              label="Unix timestamp (milliseconds)"
              value={dateResults.milliseconds}
              copiedValue={copiedValue}
              onCopy={handleCopy}
            />
          </div>
        )}
      </section>
    </div>
  )
}
