const MINUTE_MS = 60_000;
const OFFSET_SAMPLE_HOURS = 36;

export type WallTimeResolution = {
  date: Date | null;
  error: string | null;
  ambiguous: boolean;
};

/** A wall-clock representation with no dependency on the host's time zone. */
export function formatWallTime(date: Date, zone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** Resolve all matching instants; gaps are rejected and overlaps choose the earlier. */
export function resolveWallTime(
  input: string,
  zone: string,
): WallTimeResolution {
  const invalid = (error: string): WallTimeResolution => ({
    date: null,
    error,
    ambiguous: false,
  });
  if (!input) return { date: null, error: null, ambiguous: false };
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input))
    return invalid("Enter a valid date and time.");
  const naive = new Date(`${input}:00Z`);
  if (
    !Number.isFinite(naive.getTime()) ||
    naive.toISOString().slice(0, 16) !== input
  )
    return invalid("Enter a valid date and time.");
  const offsets = new Set<number>();
  for (
    let hour = -OFFSET_SAMPLE_HOURS;
    hour <= OFFSET_SAMPLE_HOURS;
    hour += 6
  ) {
    const instant = new Date(naive.getTime() + hour * 60 * MINUTE_MS);
    const wall = new Date(`${formatWallTime(instant, zone)}:00Z`);
    offsets.add(wall.getTime() - instant.getTime());
  }
  const candidates = [...offsets]
    .map((offset) => new Date(naive.getTime() - offset))
    .filter((date) => formatWallTime(date, zone) === input)
    .sort((a, b) => a.getTime() - b.getTime());
  if (!candidates.length)
    return invalid(
      "This local time does not exist because the clocks move forward. Choose a time before or after the gap.",
    );
  return { date: candidates[0], error: null, ambiguous: candidates.length > 1 };
}
