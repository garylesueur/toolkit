const dateFormatter = Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
})

const timeFormatter = Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
})

const dateTimeFormatter = Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

const relativeFormatter = new Intl.RelativeTimeFormat("en-GB", {
  numeric: "auto",
})

const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: "seconds" },
  { amount: 60, unit: "minutes" },
  { amount: 24, unit: "hours" },
  { amount: 7, unit: "days" },
  { amount: 4.34524, unit: "weeks" },
  { amount: 12, unit: "months" },
  { amount: Number.POSITIVE_INFINITY, unit: "years" },
]

export function formatDate(date: Date | number | string): string {
  return dateFormatter.format(new Date(date))
}

export function formatTime(date: Date | number | string): string {
  return timeFormatter.format(new Date(date))
}

export function formatDateTime(date: Date | number | string): string {
  return dateTimeFormatter.format(new Date(date))
}

export function formatRelative(date: Date | number | string): string {
  let duration = (new Date(date).getTime() - Date.now()) / 1000

  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return relativeFormatter.format(Math.round(duration), division.unit)
    }
    duration /= division.amount
  }

  return formatDate(date)
}
