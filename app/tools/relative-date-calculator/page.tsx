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
import { RiCalendarLine } from "@remixicon/react"
import { CopyableRow } from "@/components/copyable-row"
import { formatDateForInput } from "@/lib/shared/date"

const COPY_RESET_MS = 2000

const SATURDAY = 6
const SUNDAY = 0

type OffsetUnit = "days" | "weeks" | "months" | "business-days"
type OffsetDirection = "after" | "before"

const DAY_OF_WEEK_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
})

const LOCAL_DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
})

/** Adds (or subtracts) business days, skipping Saturdays and Sundays. */
function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date)
  const direction = days >= 0 ? 1 : -1
  let remaining = Math.abs(days)

  while (remaining > 0) {
    result.setDate(result.getDate() + direction)
    const dayOfWeek = result.getDay()
    if (dayOfWeek !== SUNDAY && dayOfWeek !== SATURDAY) {
      remaining--
    }
  }

  return result
}

function computeResultDate(
  base: Date,
  amount: number,
  unit: OffsetUnit,
  direction: OffsetDirection,
): Date {
  const signedAmount = direction === "before" ? -amount : amount
  const result = new Date(base)

  switch (unit) {
    case "days":
      result.setDate(result.getDate() + signedAmount)
      return result
    case "weeks": {
      const DAYS_PER_WEEK = 7
      result.setDate(result.getDate() + signedAmount * DAYS_PER_WEEK)
      return result
    }
    case "months":
      result.setMonth(result.getMonth() + signedAmount)
      return result
    case "business-days":
      return addBusinessDays(base, signedAmount)
  }
}

interface FormattedResult {
  label: string
  value: string
}

function formatResults(date: Date): FormattedResult[] {
  return [
    { label: "ISO 8601", value: date.toISOString().slice(0, 10) },
    { label: "Local date", value: LOCAL_DATE_FORMATTER.format(date) },
    { label: "Day of week", value: DAY_OF_WEEK_FORMATTER.format(date) },
  ]
}

export default function RelativeDateCalculatorPage() {
  const [dateInput, setDateInput] = useState("")
  const [amount, setAmount] = useState("1")
  const [unit, setUnit] = useState<OffsetUnit>("days")
  const [direction, setDirection] = useState<OffsetDirection>("after")
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

  const parsedDate = dateInput.trim() !== "" ? new Date(dateInput + "T00:00:00") : null
  const isInvalid = parsedDate !== null && Number.isNaN(parsedDate.getTime())
  const isValid = parsedDate !== null && !isInvalid

  const parsedAmount = Number(amount)
  const isAmountValid = amount.trim() !== "" && Number.isFinite(parsedAmount) && parsedAmount >= 0

  const resultDate = useMemo(() => {
    if (!isValid || !isAmountValid || parsedDate === null) return null
    return computeResultDate(parsedDate, parsedAmount, unit, direction)
  }, [isValid, isAmountValid, parsedDate, parsedAmount, unit, direction])

  const formats = useMemo(() => {
    if (!resultDate) return null
    return formatResults(resultDate)
  }, [resultDate])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Relative Date Calculator
        </h1>
        <p className="text-muted-foreground mt-1">
          Calculate a date by adding or subtracting days, weeks, months, or
          business days from a base date.
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 space-y-2">
            <Label htmlFor="base-date">Base date</Label>
            <Input
              id="base-date"
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

        {isInvalid && (
          <p className="text-sm text-destructive">
            Invalid date — could not parse.
          </p>
        )}

        <div className="flex items-end gap-2">
          <div className="space-y-2">
            <Label htmlFor="offset-amount">Offset</Label>
            <Input
              id="offset-amount"
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-24"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="offset-unit">Unit</Label>
            <Select
              value={unit}
              onValueChange={(v) => setUnit(v as OffsetUnit)}
            >
              <SelectTrigger id="offset-unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="days">Days</SelectItem>
                <SelectItem value="weeks">Weeks</SelectItem>
                <SelectItem value="months">Months</SelectItem>
                <SelectItem value="business-days">Business days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="offset-direction">Direction</Label>
            <Select
              value={direction}
              onValueChange={(v) => setDirection(v as OffsetDirection)}
            >
              <SelectTrigger id="offset-direction">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="after">After</SelectItem>
                <SelectItem value="before">Before</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

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
