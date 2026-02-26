"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RiTimeLine } from "@remixicon/react"
import { CopyableRow } from "@/components/copyable-row"
import { formatDateTimeLocalForInput } from "@/lib/shared/date"

const COPY_RESET_MS = 2000
const MS_PER_SECOND = 1000
const MS_PER_MINUTE = 60 * MS_PER_SECOND
const MS_PER_HOUR = 60 * MS_PER_MINUTE
const MS_PER_DAY = 24 * MS_PER_HOUR

interface DurationBreakdown {
  years: number
  months: number
  days: number
}

/**
 * Computes the calendar difference between two dates as years, months, and
 * remaining days. Always returns non-negative values by sorting the dates
 * internally.
 */
function computeCalendarDuration(a: Date, b: Date): DurationBreakdown {
  const [start, end] = a <= b ? [a, b] : [b, a]

  let years = end.getFullYear() - start.getFullYear()
  let months = end.getMonth() - start.getMonth()
  let days = end.getDate() - start.getDate()

  if (days < 0) {
    months -= 1
    const previousMonth = new Date(end.getFullYear(), end.getMonth(), 0)
    days += previousMonth.getDate()
  }

  if (months < 0) {
    years -= 1
    months += 12
  }

  return { years, months, days }
}

function formatBreakdown({ years, months, days }: DurationBreakdown): string {
  const parts: string[] = []

  if (years > 0) {
    parts.push(`${years} ${years === 1 ? "year" : "years"}`)
  }
  if (months > 0) {
    parts.push(`${months} ${months === 1 ? "month" : "months"}`)
  }
  if (days > 0 || parts.length === 0) {
    parts.push(`${days} ${days === 1 ? "day" : "days"}`)
  }

  return parts.join(", ")
}

function formatLocalDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

interface DurationInputsState {
  years: string
  months: string
  days: string
  hours: string
  minutes: string
}

const EMPTY_DURATION_INPUTS: DurationInputsState = {
  years: "",
  months: "",
  days: "",
  hours: "",
  minutes: "",
}

export default function DurationCalculatorPage() {
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [addStartDate, setAddStartDate] = useState("")
  const [durationInputs, setDurationInputs] =
    useState<DurationInputsState>(EMPTY_DURATION_INPUTS)
  const [copiedValue, setCopiedValue] = useState<string | null>(null)

  const handleCopy = useCallback(async (value: string) => {
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopiedValue(value)
    setTimeout(() => setCopiedValue(null), COPY_RESET_MS)
  }, [])

  const handleStartNow = useCallback(() => {
    setStartDate(formatDateTimeLocalForInput(new Date()))
  }, [])

  const handleEndNow = useCallback(() => {
    setEndDate(formatDateTimeLocalForInput(new Date()))
  }, [])

  const handleAddStartNow = useCallback(() => {
    setAddStartDate(formatDateTimeLocalForInput(new Date()))
  }, [])

  const handleDurationChange = useCallback(
    (field: keyof DurationInputsState, value: string) => {
      setDurationInputs((prev) => ({ ...prev, [field]: value }))
    },
    [],
  )

  // Section 1: Duration between two dates
  const startMs = startDate ? new Date(startDate).getTime() : NaN
  const endMs = endDate ? new Date(endDate).getTime() : NaN
  const hasBothDates = !Number.isNaN(startMs) && !Number.isNaN(endMs)

  const diffMs = hasBothDates ? Math.abs(endMs - startMs) : 0
  const calendarBreakdown =
    hasBothDates
      ? computeCalendarDuration(new Date(startDate), new Date(endDate))
      : null

  const betweenResults = hasBothDates
    ? {
        breakdown: formatBreakdown(calendarBreakdown!),
        totalDays: Math.floor(diffMs / MS_PER_DAY).toLocaleString("en-GB"),
        totalHours: Math.floor(diffMs / MS_PER_HOUR).toLocaleString("en-GB"),
        totalMinutes: Math.floor(diffMs / MS_PER_MINUTE).toLocaleString("en-GB"),
        totalSeconds: Math.floor(diffMs / MS_PER_SECOND).toLocaleString("en-GB"),
        totalMilliseconds: diffMs.toLocaleString("en-GB"),
      }
    : null

  // Section 2: Add duration to a date
  const addStartMs = addStartDate ? new Date(addStartDate).getTime() : NaN
  const hasAddStart = !Number.isNaN(addStartMs)

  const parsedYears = parseInt(durationInputs.years, 10) || 0
  const parsedMonths = parseInt(durationInputs.months, 10) || 0
  const parsedDays = parseInt(durationInputs.days, 10) || 0
  const parsedHours = parseInt(durationInputs.hours, 10) || 0
  const parsedMinutes = parseInt(durationInputs.minutes, 10) || 0

  const hasDurationInput =
    parsedYears !== 0 ||
    parsedMonths !== 0 ||
    parsedDays !== 0 ||
    parsedHours !== 0 ||
    parsedMinutes !== 0

  const addResult = hasAddStart && hasDurationInput
    ? (() => {
        const base = new Date(addStartDate)
        const result = new Date(base)
        result.setFullYear(result.getFullYear() + parsedYears)
        result.setMonth(result.getMonth() + parsedMonths)
        result.setDate(result.getDate() + parsedDays)
        result.setHours(result.getHours() + parsedHours)
        result.setMinutes(result.getMinutes() + parsedMinutes)
        return {
          iso: result.toISOString(),
          local: formatLocalDateTime(result),
        }
      })()
    : null

  const durationFields: { field: keyof DurationInputsState; label: string }[] = [
    { field: "years", label: "Years" },
    { field: "months", label: "Months" },
    { field: "days", label: "Days" },
    { field: "hours", label: "Hours" },
    { field: "minutes", label: "Minutes" },
  ]

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Duration Calculator
        </h1>
        <p className="text-muted-foreground mt-1">
          Calculate the duration between two dates, or add a duration to find an
          end date.
        </p>
      </div>

      {/* Section 1: Duration between two dates */}
      <section>
        <h2 className="text-lg font-semibold">Duration Between Two Dates</h2>

        <div className="mt-4 space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="start-date">Start date</Label>
              <Input
                id="start-date"
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex shrink-0 items-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleStartNow}
              >
                <RiTimeLine data-icon="inline-start" />
                Now
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="end-date">End date</Label>
              <Input
                id="end-date"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex shrink-0 items-end">
              <Button type="button" variant="outline" onClick={handleEndNow}>
                <RiTimeLine data-icon="inline-start" />
                Now
              </Button>
            </div>
          </div>
        </div>

        {betweenResults && (
          <div className="mt-4 space-y-2">
            <CopyableRow
              label="Years, months, days"
              value={betweenResults.breakdown}
              copiedValue={copiedValue}
              onCopy={handleCopy}
            />
            <CopyableRow
              label="Total days"
              value={betweenResults.totalDays}
              copiedValue={copiedValue}
              onCopy={handleCopy}
            />
            <CopyableRow
              label="Total hours"
              value={betweenResults.totalHours}
              copiedValue={copiedValue}
              onCopy={handleCopy}
            />
            <CopyableRow
              label="Total minutes"
              value={betweenResults.totalMinutes}
              copiedValue={copiedValue}
              onCopy={handleCopy}
            />
            <CopyableRow
              label="Total seconds"
              value={betweenResults.totalSeconds}
              copiedValue={copiedValue}
              onCopy={handleCopy}
            />
            <CopyableRow
              label="Total milliseconds"
              value={betweenResults.totalMilliseconds}
              copiedValue={copiedValue}
              onCopy={handleCopy}
            />
          </div>
        )}
      </section>

      {/* Section 2: Add duration to a date */}
      <section>
        <h2 className="text-lg font-semibold">Add Duration to a Date</h2>

        <div className="mt-4 space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="add-start-date">Start date</Label>
              <Input
                id="add-start-date"
                type="datetime-local"
                value={addStartDate}
                onChange={(e) => setAddStartDate(e.target.value)}
              />
            </div>
            <div className="flex shrink-0 items-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleAddStartNow}
              >
                <RiTimeLine data-icon="inline-start" />
                Now
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {durationFields.map(({ field, label }) => (
              <div key={field} className="space-y-2">
                <Label htmlFor={`duration-${field}`}>{label}</Label>
                <Input
                  id={`duration-${field}`}
                  type="number"
                  min="0"
                  placeholder="0"
                  value={durationInputs[field]}
                  onChange={(e) => handleDurationChange(field, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        {addResult && (
          <div className="mt-4 space-y-2">
            <CopyableRow
              label="ISO 8601"
              value={addResult.iso}
              copiedValue={copiedValue}
              onCopy={handleCopy}
            />
            <CopyableRow
              label="Local date/time"
              value={addResult.local}
              copiedValue={copiedValue}
              onCopy={handleCopy}
            />
          </div>
        )}
      </section>
    </div>
  )
}
