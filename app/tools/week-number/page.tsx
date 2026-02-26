"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RiCalendarLine } from "@remixicon/react"
import { CopyableRow } from "@/components/copyable-row"
import { formatDateForInput } from "@/lib/shared/date"

const COPY_RESET_MS = 2000

const ISO_MONDAY = 1
const ISO_SUNDAY = 7
const DAYS_PER_WEEK = 7
const MS_PER_DAY = 86_400_000
const MIN_WEEK = 1
const MAX_WEEK = 53

const DAY_NAMES: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
}

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
})

function getIsoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || ISO_SUNDAY))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / MS_PER_DAY + 1) / DAYS_PER_WEEK)
}

function getIsoWeekYear(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || ISO_SUNDAY))
  return d.getUTCFullYear()
}

interface WeekDateRange {
  monday: Date
  sunday: Date
}

function getDateRangeForIsoWeek(week: number, year: number): WeekDateRange {
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dayOfWeek = jan4.getUTCDay() || ISO_SUNDAY
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + ISO_MONDAY + (week - 1) * DAYS_PER_WEEK)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  return { monday, sunday }
}

/**
 * Returns the ISO day-of-week number (Monday = 1, Sunday = 7).
 * `Date.getDay()` returns 0 for Sunday, so we remap it.
 */
function getIsoDayOfWeek(date: Date): number {
  return date.getDay() || ISO_SUNDAY
}

interface DateToWeekResult {
  weekNumber: number
  weekYear: number
  dayName: string
  isoDayNumber: number
}

function computeDateToWeek(date: Date): DateToWeekResult {
  const isoDayNumber = getIsoDayOfWeek(date)
  return {
    weekNumber: getIsoWeekNumber(date),
    weekYear: getIsoWeekYear(date),
    dayName: DAY_NAMES[isoDayNumber] ?? "",
    isoDayNumber,
  }
}

export default function WeekNumberPage() {
  const [dateInput, setDateInput] = useState("")
  const [weekInput, setWeekInput] = useState("")
  const [yearInput, setYearInput] = useState(() => new Date().getFullYear().toString())
  const [copiedValue, setCopiedValue] = useState<string | null>(null)

  const handleCopy = useCallback(async (value: string) => {
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopiedValue(value)
    setTimeout(() => setCopiedValue(null), COPY_RESET_MS)
  }, [])

  const handleToday = useCallback(() => {
    setDateInput(formatDateForInput(new Date()))
  }, [])

  const parsedDate = dateInput.trim() !== "" ? new Date(dateInput) : null
  const isDateValid = parsedDate !== null && !Number.isNaN(parsedDate.getTime())
  const dateResult = isDateValid ? computeDateToWeek(parsedDate) : null

  const weekNum = weekInput.trim() !== "" ? Number(weekInput) : null
  const yearNum = yearInput.trim() !== "" ? Number(yearInput) : null
  const isWeekValid =
    weekNum !== null &&
    yearNum !== null &&
    Number.isInteger(weekNum) &&
    Number.isInteger(yearNum) &&
    weekNum >= MIN_WEEK &&
    weekNum <= MAX_WEEK
  const weekRange = isWeekValid ? getDateRangeForIsoWeek(weekNum, yearNum) : null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Week Number Lookup
        </h1>
        <p className="text-muted-foreground mt-1">
          Find the ISO week number for any date, or look up the date range for
          a given week.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Date to Week Number</h2>

        <div className="flex gap-2">
          <div className="flex-1 space-y-2">
            <Label htmlFor="date-input">Date</Label>
            <Input
              id="date-input"
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
            />
          </div>
          <div className="flex shrink-0 items-end">
            <Button type="button" variant="outline" onClick={handleToday}>
              <RiCalendarLine data-icon="inline-start" />
              Today
            </Button>
          </div>
        </div>

        {dateResult && (
          <div className="space-y-2">
            <CopyableRow
              label="ISO week number"
              value={`Week ${dateResult.weekNumber}`}
              copiedValue={copiedValue}
              onCopy={handleCopy}
            />
            <CopyableRow
              label="ISO week year"
              value={dateResult.weekYear.toString()}
              copiedValue={copiedValue}
              onCopy={handleCopy}
            />
            <CopyableRow
              label="Day of the week"
              value={dateResult.dayName}
              copiedValue={copiedValue}
              onCopy={handleCopy}
            />
            <CopyableRow
              label="Day number within the week (ISO)"
              value={dateResult.isoDayNumber.toString()}
              copiedValue={copiedValue}
              onCopy={handleCopy}
            />
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Week Number to Date Range</h2>

        <div className="flex gap-2">
          <div className="flex-1 space-y-2">
            <Label htmlFor="week-input">Week number (1–53)</Label>
            <Input
              id="week-input"
              type="number"
              min={MIN_WEEK}
              max={MAX_WEEK}
              value={weekInput}
              onChange={(e) => setWeekInput(e.target.value)}
              placeholder="e.g. 9"
            />
          </div>
          <div className="flex-1 space-y-2">
            <Label htmlFor="year-input">Year</Label>
            <Input
              id="year-input"
              type="number"
              value={yearInput}
              onChange={(e) => setYearInput(e.target.value)}
              placeholder="e.g. 2026"
            />
          </div>
        </div>

        {weekRange && (
          <div className="space-y-2">
            <CopyableRow
              label="Monday (start of week)"
              value={DATE_FORMATTER.format(weekRange.monday)}
              copiedValue={copiedValue}
              onCopy={handleCopy}
            />
            <CopyableRow
              label="Sunday (end of week)"
              value={DATE_FORMATTER.format(weekRange.sunday)}
              copiedValue={copiedValue}
              onCopy={handleCopy}
            />
          </div>
        )}
      </section>
    </div>
  )
}
