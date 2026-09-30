import assert from "node:assert/strict";
import test from "node:test";

import { resolveWallTime, formatWallTime } from "../lib/shared/timezone.ts";

test("wall-time conversion is independent of browser zone around DST", () => {
  const original = process.env.TZ;
  try {
    for (const host of ["UTC", "Europe/London", "America/Los_Angeles"]) {
      process.env.TZ = host;
      assert.equal(
        resolveWallTime(
          "2026-03-08T03:30",
          "America/New_York",
        ).date?.toISOString(),
        "2026-03-08T07:30:00.000Z",
      );
      assert.equal(
        resolveWallTime("2026-07-01T12:00", "Asia/Kolkata").date?.toISOString(),
        "2026-07-01T06:30:00.000Z",
      );
      assert.equal(
        resolveWallTime("2026-01-01T00:00", "UTC").date?.toISOString(),
        "2026-01-01T00:00:00.000Z",
      );
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test("gaps reject and overlaps select the earlier matching instant", () => {
  assert.equal(
    resolveWallTime("2026-03-08T02:30", "America/New_York").date,
    null,
  );
  assert.equal(resolveWallTime("2026-03-29T01:30", "Europe/London").date, null);
  const ny = resolveWallTime("2026-11-01T01:30", "America/New_York");
  assert.equal(ny.ambiguous, true);
  assert.equal(ny.date?.toISOString(), "2026-11-01T05:30:00.000Z");
  assert.equal(
    resolveWallTime("2026-10-25T01:30", "Europe/London").date?.toISOString(),
    "2026-10-25T00:30:00.000Z",
  );
  assert.equal(resolveWallTime("2026-02-30T12:00", "UTC").date, null);
});

test("Now formatted in each source zone resolves to the same minute", () => {
  const now = new Date("2026-09-30T12:34:56Z");
  for (const zone of [
    "UTC",
    "America/New_York",
    "Europe/London",
    "Asia/Kolkata",
    "Australia/Sydney",
  ]) {
    assert.equal(
      resolveWallTime(formatWallTime(now, zone), zone).date?.getTime(),
      now.getTime() - 56_000,
    );
  }
});
