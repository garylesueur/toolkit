import assert from "node:assert/strict";
import test from "node:test";

import { buildCronExpression } from "../lib/cron/build.ts";

test("builds every-minute and stepped minute schedules", () => {
  assert.equal(
    buildCronExpression({ frequency: "minutes", interval: 1 }),
    "* * * * *",
  );
  assert.equal(
    buildCronExpression({ frequency: "minutes", interval: 15 }),
    "*/15 * * * *",
  );
});

test("builds hourly schedules at the selected minute", () => {
  assert.equal(
    buildCronExpression({ frequency: "hourly", minute: 42 }),
    "42 * * * *",
  );
});

test("builds daily schedules using 24-hour time", () => {
  assert.equal(
    buildCronExpression({ frequency: "daily", hour: 6, minute: 5 }),
    "5 6 * * *",
  );
});

test("sorts and deduplicates selected weekdays", () => {
  assert.equal(
    buildCronExpression({
      frequency: "weekly",
      days: [5, 1, 3, 1],
      hour: 9,
      minute: 30,
    }),
    "30 9 * * 1,3,5",
  );
});

test("builds monthly schedules for the selected day", () => {
  assert.equal(
    buildCronExpression({
      frequency: "monthly",
      day: 31,
      hour: 23,
      minute: 59,
    }),
    "59 23 31 * *",
  );
});

test("rejects invalid minute intervals", () => {
  assert.throws(
    () => buildCronExpression({ frequency: "minutes", interval: 0 }),
    /Interval must be a whole number from 1 to 59/,
  );
  assert.throws(
    () => buildCronExpression({ frequency: "minutes", interval: 2.5 }),
    /whole number/,
  );
});

test("rejects invalid hours and minutes", () => {
  assert.throws(
    () => buildCronExpression({ frequency: "daily", hour: 24, minute: 0 }),
    /Hour must be a whole number from 0 to 23/,
  );
  assert.throws(
    () => buildCronExpression({ frequency: "daily", hour: 12, minute: 60 }),
    /Minute must be a whole number from 0 to 59/,
  );
});

test("requires at least one weekly day", () => {
  assert.throws(
    () =>
      buildCronExpression({
        frequency: "weekly",
        days: [],
        hour: 9,
        minute: 0,
      }),
    /Choose at least one day/,
  );
});

test("rejects invalid weekday and month-day values", () => {
  assert.throws(
    () =>
      buildCronExpression({
        frequency: "weekly",
        days: [7],
        hour: 9,
        minute: 0,
      }),
    /Day of week must be a whole number from 0 to 6/,
  );
  assert.throws(
    () =>
      buildCronExpression({
        frequency: "monthly",
        day: 0,
        hour: 9,
        minute: 0,
      }),
    /Day of month must be a whole number from 1 to 31/,
  );
});
