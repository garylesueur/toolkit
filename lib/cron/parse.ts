import cronstrue from "cronstrue"

interface FieldBounds {
  min: number
  max: number
}

const FIELD_BOUNDS: FieldBounds[] = [
  { min: 0, max: 59 },  // minute
  { min: 0, max: 23 },  // hour
  { min: 1, max: 31 },  // day of month
  { min: 1, max: 12 },  // month
  { min: 0, max: 6 },   // day of week (0 = Sunday)
]

const MAX_ITERATIONS = 525_960 // ~1 year of minutes, safety limit

/**
 * Expands a single cron field (e.g. "1-5", "1,3,5", or step expressions) into the
 * set of integer values it represents within the given bounds.
 */
function expandField(field: string, bounds: FieldBounds): Set<number> {
  const values = new Set<number>()

  for (const part of field.split(",")) {
    const stepMatch = part.match(/^(.+)\/(\d+)$/)
    const step = stepMatch ? parseInt(stepMatch[2], 10) : 1
    const rangePart = stepMatch ? stepMatch[1] : part

    let start: number
    let end: number

    if (rangePart === "*") {
      start = bounds.min
      end = bounds.max
    } else if (rangePart.includes("-")) {
      const [lo, hi] = rangePart.split("-")
      start = parseInt(lo, 10)
      end = parseInt(hi, 10)
    } else {
      start = parseInt(rangePart, 10)
      end = start
    }

    if (Number.isNaN(start) || Number.isNaN(end) || Number.isNaN(step)) {
      throw new Error(`Invalid cron field: ${field}`)
    }

    for (let i = start; i <= end; i += step) {
      if (i >= bounds.min && i <= bounds.max) {
        values.add(i)
      }
    }
  }

  return values
}

interface ParsedCron {
  minutes: Set<number>
  hours: Set<number>
  daysOfMonth: Set<number>
  months: Set<number>
  daysOfWeek: Set<number>
}

function parseCronExpression(expression: string): ParsedCron {
  const parts = expression.trim().split(/\s+/)
  if (parts.length !== 5) {
    throw new Error("Cron expression must have exactly 5 fields")
  }

  return {
    minutes: expandField(parts[0], FIELD_BOUNDS[0]),
    hours: expandField(parts[1], FIELD_BOUNDS[1]),
    daysOfMonth: expandField(parts[2], FIELD_BOUNDS[2]),
    months: expandField(parts[3], FIELD_BOUNDS[3]),
    daysOfWeek: expandField(parts[4], FIELD_BOUNDS[4]),
  }
}

function dateMatchesCron(date: Date, cron: ParsedCron): boolean {
  return (
    cron.minutes.has(date.getMinutes()) &&
    cron.hours.has(date.getHours()) &&
    cron.daysOfMonth.has(date.getDate()) &&
    cron.months.has(date.getMonth() + 1) &&
    cron.daysOfWeek.has(date.getDay())
  )
}

/**
 * Computes the next `count` run times for a standard 5-field cron expression,
 * walking forward minute-by-minute from the current time.
 */
export function getNextCronRuns(expression: string, count: number): Date[] {
  const cron = parseCronExpression(expression)
  const results: Date[] = []

  const cursor = new Date()
  cursor.setSeconds(0, 0)
  cursor.setTime(cursor.getTime() + 60_000) // start from the next minute

  let iterations = 0
  while (results.length < count && iterations < MAX_ITERATIONS) {
    if (dateMatchesCron(cursor, cron)) {
      results.push(new Date(cursor))
    }
    cursor.setTime(cursor.getTime() + 60_000)
    iterations++
  }

  return results
}

/**
 * Returns a human-readable description of a cron expression,
 * or a user-friendly error message if the expression is invalid.
 */
export function describeCron(expression: string): string {
  try {
    return cronstrue.toString(expression, { use24HourTimeFormat: true })
  } catch {
    return "Invalid cron expression"
  }
}
