export type CronSchedule =
  | { frequency: "minutes"; interval: number }
  | { frequency: "hourly"; minute: number }
  | { frequency: "daily"; hour: number; minute: number }
  | {
      frequency: "weekly";
      days: number[];
      hour: number;
      minute: number;
    }
  | { frequency: "monthly"; day: number; hour: number; minute: number };

function requireInteger(
  value: number,
  label: string,
  minimum: number,
  maximum: number,
): number {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(
      `${label} must be a whole number from ${minimum} to ${maximum}`,
    );
  }

  return value;
}

function buildTime(hour: number, minute: number): string {
  const validHour = requireInteger(hour, "Hour", 0, 23);
  const validMinute = requireInteger(minute, "Minute", 0, 59);
  return `${validMinute} ${validHour}`;
}

export function buildCronExpression(schedule: CronSchedule): string {
  switch (schedule.frequency) {
    case "minutes": {
      const interval = requireInteger(schedule.interval, "Interval", 1, 59);
      return interval === 1 ? "* * * * *" : `*/${interval} * * * *`;
    }
    case "hourly":
      return `${requireInteger(schedule.minute, "Minute", 0, 59)} * * * *`;
    case "daily":
      return `${buildTime(schedule.hour, schedule.minute)} * * *`;
    case "weekly": {
      if (schedule.days.length === 0) {
        throw new RangeError("Choose at least one day of the week");
      }

      const days = [
        ...new Set(
          schedule.days.map((day) => requireInteger(day, "Day of week", 0, 6)),
        ),
      ].sort((left, right) => left - right);

      return `${buildTime(schedule.hour, schedule.minute)} * * ${days.join(",")}`;
    }
    case "monthly":
      return `${buildTime(schedule.hour, schedule.minute)} ${requireInteger(schedule.day, "Day of month", 1, 31)} * *`;
  }
}
