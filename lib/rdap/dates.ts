const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Expiry inside this window is worth flagging in the UI. */
export const EXPIRY_WARNING_DAYS = 30;

export function formatRdapDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

/** Negative when the date is in the past. */
export function daysUntil(value: string): number | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return Math.round((date.getTime() - Date.now()) / MS_PER_DAY);
}

export function describeRelativeDays(days: number): string {
  if (days === 0) return "today";
  if (days > 0) return `in ${days} day${days === 1 ? "" : "s"}`;

  const past = Math.abs(days);
  return `${past} day${past === 1 ? "" : "s"} ago`;
}
