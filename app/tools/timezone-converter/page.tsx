"use client";

import { RiTimeLine, RiAddLine, RiCloseLine } from "@remixicon/react";
import { useState, useMemo, useCallback, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatWallTime, resolveWallTime } from "@/lib/shared/timezone";

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
] as const;

/** Stable pre-render value — see `sourceZone` below. */
const FALLBACK_ZONE = "UTC";

const DEFAULT_ZONES: ReadonlyArray<string> = [
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
];

interface ConvertedTime {
  zone: string;
  formatted: string;
  offset: string;
}

/**
 * Formats a UTC offset string like "UTC+5:30" or "UTC-8" from an `Intl`
 * long-offset string such as "GMT+05:30".
 */
function formatUtcOffset(date: Date, zone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    timeZoneName: "longOffset",
  }).formatToParts(date);

  const tzPart = parts.find((p) => p.type === "timeZoneName");
  if (!tzPart) return "UTC";

  const raw = tzPart.value;
  if (raw === "GMT" || raw === "UTC") return "UTC+0";

  const cleaned = raw.replace("GMT", "UTC").replace(/:00$/, "");

  return cleaned;
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
  }).format(date);
}

export default function TimezoneConverterPage() {
  const [dateTimeInput, setDateTimeInput] = useState("");
  const [nowInstant, setNowInstant] = useState<Date | null>(null);
  /**
   * Starts at UTC rather than the visitor's zone: reading `resolvedOptions()`
   * during render resolves to the server's zone while pre-rendering and the
   * visitor's on hydration, which mismatches for anyone not already on UTC.
   */
  const [sourceZone, setSourceZone] = useState<string>(FALLBACK_ZONE);
  const [selectedZones, setSelectedZones] = useState<string[]>([
    ...DEFAULT_ZONES,
  ]);
  const [addZoneValue, setAddZoneValue] = useState("");

  useEffect(() => {
    const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // The picker only offers the zones in `AVAILABLE_ZONES`; selecting one
    // outside that list would leave the trigger showing nothing.
    if ((AVAILABLE_ZONES as ReadonlyArray<string>).includes(local)) {
      setSourceZone(local);
    }
  }, []);

  const handleNow = useCallback(() => {
    const now = new Date();
    now.setSeconds(0, 0);
    setNowInstant(now);
    setDateTimeInput(formatWallTime(now, sourceZone));
  }, [sourceZone]);

  const handleRemoveZone = useCallback((zone: string) => {
    setSelectedZones((prev) => prev.filter((z) => z !== zone));
  }, []);

  const handleAddZone = useCallback(
    (zone: string) => {
      if (!zone || selectedZones.includes(zone)) return;
      setSelectedZones((prev) => [...prev, zone]);
      setAddZoneValue("");
    },
    [selectedZones],
  );

  const resolution = useMemo(
    () => resolveWallTime(dateTimeInput, sourceZone),
    [dateTimeInput, sourceZone],
  );
  const sourceDate = nowInstant ?? resolution.date;

  const convertedTimes: ConvertedTime[] = useMemo(() => {
    if (!sourceDate) return [];

    return selectedZones.map((zone) => ({
      zone,
      formatted: formatInZone(sourceDate, zone),
      offset: formatUtcOffset(sourceDate, zone),
    }));
  }, [sourceDate, selectedZones]);

  const addableZones = useMemo(
    () => AVAILABLE_ZONES.filter((z) => !selectedZones.includes(z)),
    [selectedZones],
  );

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
                onChange={(e) => {
                  setNowInstant(null);
                  setDateTimeInput(e.target.value);
                }}
              />
              <Button type="button" variant="outline" onClick={handleNow}>
                <RiTimeLine data-icon="inline-start" />
                Now
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source-zone">Source time zone</Label>
            <Select
              value={sourceZone}
              onValueChange={(zone) => {
                setNowInstant(null);
                setSourceZone(zone);
              }}
            >
              <SelectTrigger id="source-zone" className="w-full sm:w-56">
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

      {resolution.error && (
        <p role="alert" className="text-destructive text-sm">
          {resolution.error}
        </p>
      )}
      {resolution.ambiguous && !nowInstant && (
        <output className="text-muted-foreground text-sm">
          This local time occurs twice when the clocks move back. The earlier
          occurrence is shown.
        </output>
      )}

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
            <Label htmlFor="add-zone">Add time zone</Label>
            <Select value={addZoneValue} onValueChange={handleAddZone}>
              <SelectTrigger id="add-zone" className="w-56">
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
              if (addZoneValue) handleAddZone(addZoneValue);
            }}
            disabled={!addZoneValue}
          >
            <RiAddLine data-icon="inline-start" />
            Add
          </Button>
        </section>
      )}
    </div>
  );
}
