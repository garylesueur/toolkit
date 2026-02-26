"use client"

import { useState, useMemo, useCallback } from "react"
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
import { RiTimeLine, RiAddLine, RiCloseLine } from "@remixicon/react"
import { formatDateTimeLocalForInput } from "@/lib/shared/date"

const AVAILABLE_ZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
  "Pacific/Auckland",
] as const

const DEFAULT_ZONES: ReadonlyArray<string> = [
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
]

interface ConvertedTime {
  zone: string
  formatted: string
  offset: string
}

/**
 * Formats a UTC offset string like "UTC+5:30" or "UTC-8" from an `Intl`
 * long-offset string such as "GMT+05:30".
 */
function formatUtcOffset(date: Date, zone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    timeZoneName: "longOffset",
  }).formatToParts(date)

  const tzPart = parts.find((p) => p.type === "timeZoneName")
  if (!tzPart) return "UTC"

  const raw = tzPart.value
  if (raw === "GMT" || raw === "UTC") return "UTC+0"

  const cleaned = raw
    .replace("GMT", "UTC")
    .replace(/:00$/, "")

  return cleaned
}

function formatInZone(date: Date, zone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date)
}

export default function TimezoneConverterPage() {
  const [dateTimeInput, setDateTimeInput] = useState("")
  const [sourceZone, setSourceZone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  )
  const [selectedZones, setSelectedZones] = useState<string[]>([
    ...DEFAULT_ZONES,
  ])
  const [addZoneValue, setAddZoneValue] = useState("")

  const handleNow = useCallback(() => {
    setDateTimeInput(formatDateTimeLocalForInput(new Date()))
  }, [])

  const handleRemoveZone = useCallback((zone: string) => {
    setSelectedZones((prev) => prev.filter((z) => z !== zone))
  }, [])

  const handleAddZone = useCallback(
    (zone: string) => {
      if (!zone || selectedZones.includes(zone)) return
      setSelectedZones((prev) => [...prev, zone])
      setAddZoneValue("")
    },
    [selectedZones],
  )

  /**
   * Converts the wall-clock `datetime-local` value (interpreted as being in
   * `sourceZone`) into a UTC `Date`. We do this by:
   *   1. Parsing the input as a local-time Date (browser TZ).
   *   2. Formatting that instant in the source zone to get the wall-clock
   *      values the source zone would show for that instant.
   *   3. Comparing those wall-clock values to the ones the user typed to
   *      derive the offset between the browser TZ and the source zone.
   *   4. Shifting the Date by that delta so it represents the correct UTC
   *      instant.
   */
  const sourceDate = useMemo(() => {
    if (!dateTimeInput.trim()) return null

    const naiveDate = new Date(dateTimeInput)
    if (Number.isNaN(naiveDate.getTime())) return null

    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: sourceZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })

    const parts = fmt.formatToParts(naiveDate)
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === type)?.value ?? "0"

    const wallInSourceZone = new Date(
      `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`,
    )

    const deltaMs = wallInSourceZone.getTime() - naiveDate.getTime()
    return new Date(naiveDate.getTime() - deltaMs)
  }, [dateTimeInput, sourceZone])

  const convertedTimes: ConvertedTime[] = useMemo(() => {
    if (!sourceDate) return []

    return selectedZones.map((zone) => ({
      zone,
      formatted: formatInZone(sourceDate, zone),
      offset: formatUtcOffset(sourceDate, zone),
    }))
  }, [sourceDate, selectedZones])

  const addableZones = useMemo(
    () => AVAILABLE_ZONES.filter((z) => !selectedZones.includes(z)),
    [selectedZones],
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Time Zone Converter
        </h1>
        <p className="text-muted-foreground mt-1">
          Pick a date and time, then see it displayed across multiple time
          zones.
        </p>
      </div>

      {/* Source date/time and zone */}
      <section className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="datetime-input">Date and time</Label>
            <div className="flex gap-2">
              <Input
                id="datetime-input"
                type="datetime-local"
                value={dateTimeInput}
                onChange={(e) => setDateTimeInput(e.target.value)}
              />
              <Button type="button" variant="outline" onClick={handleNow}>
                <RiTimeLine data-icon="inline-start" />
                Now
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Source time zone</Label>
            <Select value={sourceZone} onValueChange={setSourceZone}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_ZONES.map((zone) => (
                  <SelectItem key={zone} value={zone}>
                    {zone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Converted times */}
      {convertedTimes.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Converted times</h2>
          <div className="space-y-2">
            {convertedTimes.map((ct) => (
              <div
                key={ct.zone}
                className="flex items-center justify-between gap-4 rounded-md border bg-muted/30 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{ct.zone}</p>
                  <p className="text-muted-foreground text-sm">
                    {ct.formatted}
                  </p>
                </div>
                <span className="text-muted-foreground shrink-0 font-mono text-xs">
                  {ct.offset}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleRemoveZone(ct.zone)}
                  aria-label={`Remove ${ct.zone}`}
                >
                  <RiCloseLine />
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state when no input */}
      {!sourceDate && selectedZones.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Converted times</h2>
          <p className="text-muted-foreground text-sm">
            Enter a date and time above to see conversions.
          </p>
        </section>
      )}

      {/* Add time zone */}
      {addableZones.length > 0 && (
        <section className="flex items-end gap-2">
          <div className="space-y-2">
            <Label>Add time zone</Label>
            <Select value={addZoneValue} onValueChange={handleAddZone}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Choose a zone…" />
              </SelectTrigger>
              <SelectContent>
                {addableZones.map((zone) => (
                  <SelectItem key={zone} value={zone}>
                    {zone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (addZoneValue) handleAddZone(addZoneValue)
            }}
            disabled={!addZoneValue}
          >
            <RiAddLine data-icon="inline-start" />
            Add
          </Button>
        </section>
      )}
    </div>
  )
}
