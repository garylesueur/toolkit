const dateFormatter = Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const timeFormatter = Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
});

const dateTimeFormatter = Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const relativeFormatter = new Intl.RelativeTimeFormat("en-GB", {
  numeric: "auto",
});

const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: "seconds" },
  { amount: 60, unit: "minutes" },
  { amount: 24, unit: "hours" },
  { amount: 7, unit: "days" },
  { amount: 4.34524, unit: "weeks" },
  { amount: 12, unit: "months" },
  { amount: Number.POSITIVE_INFINITY, unit: "years" },
];

export const MONTHS_PER_YEAR = 12;

/**
 * Adds calendar months, clamping to the last day of the target month.
 *
 * `setMonth` overflows instead of clamping: 31 January plus one month lands on
 * 2 or 3 March rather than the end of February. Every calendar app clamps, and
 * so does every user's expectation.
 */
export function addMonths(base: Date, months: number): Date {
  const result = new Date(base);
  const targetMonth = base.getMonth() + months;

  // Day 0 of the following month is the last day of the target month.
  const lastDayOfTargetMonth = new Date(
    base.getFullYear(),
    targetMonth + 1,
    0,
  ).getDate();

  result.setDate(Math.min(base.getDate(), lastDayOfTargetMonth));
  result.setMonth(targetMonth);
  return result;
}

/** Adds calendar years with the same end-of-month clamping as `addMonths`. */
export function addYears(base: Date, years: number): Date {
  return addMonths(base, years * MONTHS_PER_YEAR);
}

export function formatDate(date: Date | number | string): string {
  return dateFormatter.format(new Date(date));
}

export function formatTime(date: Date | number | string): string {
  return timeFormatter.format(new Date(date));
}

export function formatDateTime(date: Date | number | string): string {
  return dateTimeFormatter.format(new Date(date));
}

/** Formats a Date for use in an HTML datetime-local input (YYYY-MM-DDTHH:mm). */
export function formatDateTimeLocalForInput(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Formats a Date for use in an HTML date input (YYYY-MM-DD). */
export function formatDateForInput(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatRelative(date: Date | number | string): string {
  let duration = (new Date(date).getTime() - Date.now()) / 1000;

  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return relativeFormatter.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }

  return formatDate(date);
}
