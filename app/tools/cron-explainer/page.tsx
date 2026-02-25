"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RiTimeLine } from "@remixicon/react"
import { describeCron, getNextCronRuns } from "@/lib/cron/parse"

interface CronPreset {
  label: string
  expression: string
}

const PRESETS: CronPreset[] = [
  { label: "Every minute", expression: "* * * * *" },
  { label: "Every 5 minutes", expression: "*/5 * * * *" },
  { label: "Every hour", expression: "0 * * * *" },
  { label: "Every day at midnight", expression: "0 0 * * *" },
  { label: "Every Monday at 9am", expression: "0 9 * * 1" },
]

const NEXT_RUNS_COUNT = 10

function formatRunDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

interface CronResult {
  description: string
  isValid: boolean
  nextRuns: Date[]
}

function evaluateCron(expression: string): CronResult {
  if (!expression.trim()) {
    return { description: "", isValid: true, nextRuns: [] }
  }

  const description = describeCron(expression)
  const isValid = description !== "Invalid cron expression"

  let nextRuns: Date[] = []
  if (isValid) {
    try {
      nextRuns = getNextCronRuns(expression, NEXT_RUNS_COUNT)
    } catch {
      return { description: "Invalid cron expression", isValid: false, nextRuns: [] }
    }
  }

  return { description, isValid, nextRuns }
}

export default function CronExplainerPage() {
  const [expression, setExpression] = useState("")

  const { description, isValid, nextRuns } = useMemo(
    () => evaluateCron(expression),
    [expression],
  )

  const hasInput = expression.trim().length > 0

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        Cron Expression Explainer
      </h1>
      <p className="text-muted-foreground mt-1">
        Enter a cron expression to see a plain-English explanation and the next
        scheduled run times.
      </p>

      <div className="mt-8 space-y-2">
        <Label htmlFor="cron-input">Cron expression</Label>
        <Input
          id="cron-input"
          placeholder="* * * * *"
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          className="font-mono"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset.expression}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setExpression(preset.expression)}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {hasInput && !isValid && (
        <p className="mt-4 text-sm text-destructive">
          {description}
        </p>
      )}

      {hasInput && isValid && description && (
        <div className="mt-6 rounded-md border bg-muted/50 px-4 py-3">
          <span className="text-muted-foreground text-xs">Description</span>
          <p className="mt-0.5 text-sm font-medium">{description}</p>
        </div>
      )}

      {hasInput && isValid && nextRuns.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold">Next {nextRuns.length} runs</h2>
          <div className="mt-3 space-y-1.5">
            {nextRuns.map((date, idx) => (
              <div
                key={date.getTime()}
                className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2"
              >
                <Badge variant="secondary" className="tabular-nums">
                  {idx + 1}
                </Badge>
                <div className="flex items-center gap-2 text-sm">
                  <RiTimeLine className="text-muted-foreground size-4 shrink-0" />
                  <span className="font-mono">{formatRunDate(date)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasInput && isValid && nextRuns.length === 0 && description && (
        <p className="text-muted-foreground mt-4 text-sm">
          No upcoming runs found within the next year.
        </p>
      )}
    </div>
  )
}
