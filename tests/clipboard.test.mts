import assert from "node:assert/strict";
import test from "node:test";

import {
  createClipboardController,
  EMPTY_COPY_FEEDBACK,
  COPY_FAILURE_MESSAGE,
} from "../lib/shared/clipboard.ts";
function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test("success follows completion and failure remains readable", async () => {
  const write = deferred();
  let feedback = EMPTY_COPY_FEEDBACK;
  const control = createClipboardController({
    write: () => write.promise,
    publish: (next) => {
      feedback = next;
    },
  });
  const pending = control.copy("payload");
  assert.equal(feedback.copiedValue, null);
  write.reject(new Error("permission denied"));
  await pending;
  assert.equal(feedback.error, COPY_FAILURE_MESSAGE);
  assert.equal(feedback.copiedValue, null);
  control.cancel();
});

test("overlapping copies and obsolete timers cannot reset newer feedback", async () => {
  const a = deferred();
  const b = deferred();
  let feedback = EMPTY_COPY_FEEDBACK;
  const callbacks: (() => void)[] = [];
  const payloads: string[] = [];
  const control = createClipboardController({
    write: (value) => {
      payloads.push(value);
      return value === "A" ? a.promise : b.promise;
    },
    publish: (next) => {
      feedback = next;
    },
    schedule: (callback) => {
      callbacks.push(callback);
      return setTimeout(() => {}, 0);
    },
    unschedule: clearTimeout,
  });
  const first = control.copy("A");
  const second = control.copy("B");
  b.resolve();
  await second;
  a.reject(new Error("stale rejection"));
  await first;
  assert.equal(feedback.copiedValue, "B");
  assert.equal(feedback.error, null);
  assert.deepEqual(payloads, ["A", "B"]);
  await control.copy("C");
  callbacks[0]();
  assert.equal(feedback.copiedValue, "C");
  control.cancel();
  callbacks[1]();
  assert.equal(feedback.copiedValue, "C");
});

test("unmount invalidation prevents a pending write from publishing", async () => {
  const write = deferred();
  let publications = 0;
  const control = createClipboardController({
    write: () => write.promise,
    publish: () => {
      publications++;
    },
  });
  const pending = control.copy("A");
  control.cancel();
  const before = publications;
  write.resolve();
  await pending;
  assert.equal(publications, before);
});
