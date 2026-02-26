"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RiTimeLine } from "@remixicon/react"
import { CopyableRow } from "@/components/copyable-row"
import { formatRelative, formatDateTimeLocalForInput } from "@/lib/shared/date"

const COPY_RESET_MS = 2000

const LOCAL_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

/**
 * Formats a Date as an RFC 2822 string.
 * `Date.toUTCString()` returns the RFC 7231 / HTTP-date format (e.g. "Wed, 25 Feb 2026 14:30:00 GMT").
 * RFC 2822 uses "+0000" instead of "GMT".
 */
function formatRfc2822(date: Date): string {
  return date.toUTCString().replace("GMT", "+0000")
}

/** Formats a Date as an SQL DATETIME string (YYYY-MM-DD HH:MM:SS) in UTC. */
function formatSqlDatetime(date: Date): string {
  return date.toISOString().replace("T", " ").slice(0, 19)
}

interface FormattedResult {
  label: string
  value: string
}

function computeFormats(date: Date): FormattedResult[] {
  const ms = date.getTime()

  return [
    { label: "ISO 8601", value: date.toISOString() },
    { label: "RFC 2822", value: formatRfc2822(date) },
    { label: "UTC string", value: date.toUTCString() },
    { label: "Local date/time", value: LOCAL_DATE_TIME_FORMATTER.format(date) },
    { label: "Relative", value: formatRelative(date) },
    { label: "SQL datetime", value: formatSqlDatetime(date) },
    { label: "Unix timestamp (seconds)", value: Math.floor(ms / 1000).toString() },
    { label: "Unix timestamp (milliseconds)", value: ms.toString() },
    { label: "Date only (ISO)", value: date.toISOString().slice(0, 10) },
    { label: "Time only (ISO)", value: date.toISOString().slice(11, 19) },
  ]
}

export default function DateFormatterPage() {
  const [dateInput, setDateInput] = useState("")
  const [copiedValue, setCopiedValue] = useState<string | null>(null)

  const handleCopy = useCallback(async (value: string) => {
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopiedValue(value)
    setTimeout(() => setCopiedValue(null), COPY_RESET_MS)
  }, [])

  const handleNow = useCallback(() => {
    setDateInput(formatDateTimeLocalForInput(new Date()))
  }, [])

  const parsedDate = dateInput.trim() !== "" ? new Date(dateInput) : null
  const isInvalid = parsedDate !== null && Number.isNaN(parsedDate.getTime())
  const isValid = parsedDate !== null && !isInvalid

  const formats = isValid ? computeFormats(parsedDate) : null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Date / Time Formatter
        </h1>
        <p className="text-muted-foreground mt-1">
          Enter a date and see it in dozens of common formats. Click any value
          to copy.
        </p>
      </div>

      <section>
        <div className="flex gap-2">
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
            <Button type="button" variant="outline" onClick={handleNow}>
              <RiTimeLine data-icon="inline-start" />
              Now
            </Button>
          </div>
        </div>

        {isInvalid && (
          <p className="mt-2 text-sm text-destructive">
            Invalid date — could not parse.
          </p>
        )}

        {formats && (
          <div className="mt-4 space-y-2">
            {formats.map((row) => (
              <CopyableRow
                key={row.label}
                label={row.label}
                value={row.value}
                copiedValue={copiedValue}
                onCopy={handleCopy}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
