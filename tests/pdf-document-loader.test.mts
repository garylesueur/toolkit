import assert from "node:assert/strict";
import test from "node:test";

import {
  createPdfDocumentLoader,
  emptyPdfState,
} from "../lib/pdf/document-loader.ts";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
type Loaded = { pdfDoc: string; bytes: Uint8Array; pageCount: number };
const loaded = (name: string): Loaded => ({
  pdfDoc: name,
  bytes: new Uint8Array([name.charCodeAt(0)]),
  pageCount: name === "A" ? 3 : 2,
});

test("newest request owns document and loading despite older parse success or failure", async () => {
  for (const failure of [false, true]) {
    const a = deferred<Loaded>();
    const b = deferred<Loaded>();
    let state = emptyPdfState<string>();
    const loader = createPdfDocumentLoader({
      parse: (file: { name: string }) =>
        file.name === "A" ? a.promise : b.promise,
      thumbnails: async () => ["thumbnail"],
      publish: (next) => {
        state = next;
      },
    });
    const first = loader.loadFile({ name: "A" });
    const second = loader.loadFile({ name: "B" });
    if (failure) a.reject(new Error("stale failure"));
    else a.resolve(loaded("A"));
    await first;
    assert.equal(state.loading, true);
    assert.equal(state.error, null);
    assert.equal(state.pdfDoc, null);
    b.resolve(loaded("B"));
    await second;
    assert.equal(state.pdfDoc, "B");
    assert.equal(state.fileName, "B");
    assert.equal(state.pageCount, 2);
    assert.deepEqual(state.thumbnails, ["thumbnail"]);
    assert.equal(state.loading, false);
  }
});

test("late thumbnails cannot overwrite B and reset cancels pending rendering", async () => {
  const thumbnail = deferred<string[]>();
  let signal!: AbortSignal;
  let state = emptyPdfState<string>();
  const loader = createPdfDocumentLoader({
    parse: async (file: { name: string }) => loaded(file.name),
    thumbnails: async (bytes, abort) => {
      if (bytes[0] === 65) {
        signal = abort;
        return thumbnail.promise;
      }
      return ["B"];
    },
    publish: (next) => {
      state = next;
    },
  });
  const first = loader.loadFile({ name: "A" });
  await Promise.resolve();
  await loader.loadFile({ name: "B" });
  assert.equal(signal.aborted, true);
  thumbnail.resolve(["A"]);
  await first;
  assert.deepEqual(state.thumbnails, ["B"]);
  const pending = loader.loadFile({ name: "A" });
  loader.reset();
  await pending;
  assert.equal(state.pdfDoc, null);
  assert.equal(state.loading, false);
  assert.deepEqual(state.thumbnails, []);
});

test("reset during parsing prevents every later publication", async () => {
  const parse = deferred<Loaded>();
  let state = emptyPdfState<string>();
  let publishes = 0;
  const loader = createPdfDocumentLoader({
    parse: (_file: { name: string }) => parse.promise,
    thumbnails: async () => [],
    publish: (next) => {
      state = next;
      publishes++;
    },
  });
  const task = loader.loadFile({ name: "A" });
  loader.reset();
  const count = publishes;
  parse.resolve(loaded("A"));
  await task;
  assert.equal(publishes, count);
  assert.equal(state.pdfDoc, null);
});

test("document-bound saves become obsolete on replacement, reset and unmount", async () => {
  const loader = createPdfDocumentLoader({
    parse: async (file: { name: string }) => loaded(file.name),
    thumbnails: async () => [],
    publish: () => {},
  });
  await loader.loadFile({ name: "A" });
  const ownsA = loader.captureDocument();
  assert.equal(ownsA(), true);
  await loader.loadFile({ name: "B" });
  assert.equal(ownsA(), false);
  const ownsB = loader.captureDocument();
  loader.reset();
  assert.equal(ownsB(), false);
  await loader.loadFile({ name: "B" });
  const afterReset = loader.captureDocument();
  loader.cancel();
  assert.equal(afterReset(), false);
});
