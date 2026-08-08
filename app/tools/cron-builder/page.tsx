"use client";

import { RiCheckLine, RiFileCopyLine } from "@remixicon/react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildCronExpression, type CronSchedule } from "@/lib/cron/build";
import { describeCron, getNextCronRuns } from "@/lib/cron/parse";

type Frequency = CronSchedule["frequency"];

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "minutes", label: "Minutes" },
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatRun(date: Date): string {
  return date.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function boundedInput(value: string, minimum: number, maximum: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return minimum;
  return Math.min(maximum, Math.max(minimum, Math.round(parsed)));
}

export default function CronBuilderPage() {
  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [interval, setInterval] = useState(15);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [monthDay, setMonthDay] = useState(1);
  const [weekdays, setWeekdays] = useState([1]);
  const [copied, setCopied] = useState(false);

  const schedule = useMemo<CronSchedule>(() => {
    switch (frequency) {
      case "minutes":
        return { frequency, interval };
      case "hourly":
        return { frequency, minute };
      case "daily":
        return { frequency, hour, minute };
      case "weekly":
        return { frequency, days: weekdays, hour, minute };
      case "monthly":
        return { frequency, day: monthDay, hour, minute };
    }
  }, [frequency, hour, interval, minute, monthDay, weekdays]);

  const expression = useMemo(() => buildCronExpression(schedule), [schedule]);
  const description = useMemo(() => describeCron(expression), [expression]);
  const nextRuns = useMemo(() => getNextCronRuns(expression, 5), [expression]);

  async function copyExpression() {
    await navigator.clipboard.writeText(expression);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  function toggleWeekday(day: number) {
    setWeekdays((current) => {
      if (current.includes(day)) {
        return current.length === 1
          ? current
          : current.filter((value) => value !== day);
      }
      return [...current, day];
    });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        Cron Expression Builder
      </h1>
      <p className="text-muted-foreground mt-1">
        Build a standard five-field cron schedule without memorising its syntax.
      </p>
      <p className="text-muted-foreground mt-2 text-sm">
        The expression and run preview are generated entirely in this browser.
      </p>

      <div
        className="mt-8 flex flex-wrap gap-2"
        aria-label="Schedule frequency"
      >
        {FREQUENCIES.map((item) => (
          <Button
            key={item.value}
            type="button"
            variant={frequency === item.value ? "default" : "outline"}
            onClick={() => setFrequency(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="mt-6 rounded-xl border bg-muted/20 p-5">
        {frequency === "minutes" && (
          <div className="max-w-xs space-y-2">
            <Label htmlFor="interval">Run every</Label>
            <div className="flex items-center gap-3">
              <Input
                id="interval"
                type="number"
                min={1}
                max={59}
                value={interval}
                onChange={(event) =>
                  setInterval(boundedInput(event.target.value, 1, 59))
                }
              />
              <span className="text-muted-foreground text-sm">minutes</span>
            </div>
          </div>
        )}

        {frequency === "hourly" && (
          <div className="max-w-xs space-y-2">
            <Label htmlFor="hourly-minute">Minute past the hour</Label>
            <Input
              id="hourly-minute"
              type="number"
              min={0}
              max={59}
              value={minute}
              onChange={(event) =>
                setMinute(boundedInput(event.target.value, 0, 59))
              }
            />
          </div>
        )}

        {(frequency === "daily" ||
          frequency === "weekly" ||
          frequency === "monthly") && (
          <div className="space-y-5">
            {frequency === "weekly" && (
              <fieldset>
                <legend className="text-sm font-medium">
                  Days of the week
                </legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {WEEKDAYS.map((label, day) => (
                    <Button
                      key={label}
                      type="button"
                      size="sm"
                      variant={weekdays.includes(day) ? "default" : "outline"}
                      aria-pressed={weekdays.includes(day)}
                      onClick={() => toggleWeekday(day)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </fieldset>
            )}

            {frequency === "monthly" && (
              <div className="max-w-xs space-y-2">
                <Label htmlFor="month-day">Day of the month</Label>
                <Input
                  id="month-day"
                  type="number"
                  min={1}
                  max={31}
                  value={monthDay}
                  onChange={(event) =>
                    setMonthDay(boundedInput(event.target.value, 1, 31))
                  }
                />
              </div>
            )}

            <div className="grid max-w-md grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hour">Hour (0–23)</Label>
                <Input
                  id="hour"
                  type="number"
                  min={0}
                  max={23}
                  value={hour}
                  onChange={(event) =>
                    setHour(boundedInput(event.target.value, 0, 23))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minute">Minute (0–59)</Label>
                <Input
                  id="minute"
                  type="number"
                  min={0}
                  max={59}
                  value={minute}
                  onChange={(event) =>
                    setMinute(boundedInput(event.target.value, 0, 59))
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <section className="mt-6 rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-semibold">Generated expression</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copyExpression}
          >
            {copied ? <RiCheckLine /> : <RiFileCopyLine />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <output className="mt-4 block rounded-lg bg-muted px-4 py-3 font-mono text-xl font-semibold">
          {expression}
        </output>
        <p className="text-muted-foreground mt-3 text-sm">{description}</p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Next 5 runs</h2>
        <ol className="mt-3 grid gap-2 sm:grid-cols-2">
          {nextRuns.map((run) => (
            <li
              key={run.getTime()}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              {formatRun(run)}
            </li>
          ))}
        </ol>
        {frequency === "monthly" && monthDay > 28 && (
          <p className="text-muted-foreground mt-3 text-xs">
            Months without day {monthDay} are skipped by cron.
          </p>
        )}
      </section>
    </div>
  );
}
