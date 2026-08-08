/// <reference lib="webworker" />

import { createFsFromVolume, Volume } from "memfs";

import "./vendor/wasm_exec.js";
import type { PdfBookmarkStage } from "./bookmarks";
import {
  buildBookmarkArguments,
  isNoBookmarksDiagnostic,
  type PdfBookmarkOperation,
} from "./bookmarks-options";

const PDFCPU_WASM_URL = "/vendor/pdfcpu/pdfcpu.wasm";
const INPUT_PATH = "/input.pdf";
const JSON_PATH = "/bookmarks.json";
const OUTPUT_PATH = "/output.pdf";
const TEMP_DIRECTORY = "/tmp";
const MAX_OUTPUT_BYTES = 512 * 1024 * 1024;

type WorkerRequest = {
  bytes: ArrayBuffer;
  json?: string;
  operation: PdfBookmarkOperation;
};

type GoRuntime = {
  argv: string[];
  env: Record<string, string>;
  importObject: WebAssembly.Imports;
  exit: (code: number) => void;
  run: (instance: WebAssembly.Instance) => Promise<void>;
};

type GoConstructor = new () => GoRuntime;
type GoWorkerGlobal = typeof globalThis & { Go: GoConstructor };

function createGoFileSystem(volume: Volume, logs: string[]): object {
  const memoryFs = createFsFromVolume(volume);
  const decoder = new TextDecoder();
  const capture = (buffer: Uint8Array) => {
    logs.push(decoder.decode(buffer));
    return buffer.byteLength;
  };
  return new Proxy(memoryFs, {
    get(target, property, receiver) {
      if (property === "writeSync") {
        return (fd: number, buffer: Uint8Array): number =>
          fd === 1 || fd === 2 ? capture(buffer) : target.writeSync(fd, buffer);
      }
      if (property === "write") {
        return (
          fd: number,
          buffer: Uint8Array,
          offset: number,
          length: number,
          position: number | null,
          callback: (error: Error | null, bytesWritten?: number) => void,
        ): void => {
          if (fd === 1 || fd === 2) {
            capture(buffer.subarray(offset, offset + length));
            callback(null, length);
            return;
          }
          target.write(fd, buffer, offset, length, position ?? -1, callback);
        };
      }
      return Reflect.get(target, property, receiver);
    },
  });
}

function configureGoGlobals(volume: Volume, logs: string[]): void {
  Reflect.set(globalThis, "fs", createGoFileSystem(volume, logs));
  Reflect.set(globalThis, "process", {
    getuid: () => -1,
    getgid: () => -1,
    geteuid: () => -1,
    getegid: () => -1,
    getgroups: () => [],
    pid: -1,
    ppid: -1,
    umask: () => 0o22,
    cwd: () => "/",
    chdir: () => undefined,
  });
  Reflect.set(globalThis, "path", {
    resolve: (...segments: string[]) => segments.join("/"),
  });
}

async function instantiatePdfCpu(go: GoRuntime): Promise<WebAssembly.Instance> {
  const response = await fetch(PDFCPU_WASM_URL);
  if (!response.ok) {
    throw new Error("The local PDF bookmark engine could not be loaded.");
  }
  if (WebAssembly.instantiateStreaming) {
    try {
      return (
        await WebAssembly.instantiateStreaming(
          response.clone(),
          go.importObject,
        )
      ).instance;
    } catch {
      // Some static hosts serve WASM with a generic MIME type.
    }
  }
  return (
    await WebAssembly.instantiate(await response.arrayBuffer(), go.importObject)
  ).instance;
}

async function runCommand(request: WorkerRequest): Promise<void> {
  const volume = new Volume();
  const logs: string[] = [];
  volume.mkdirSync(TEMP_DIRECTORY);
  volume.writeFileSync(INPUT_PATH, new Uint8Array(request.bytes));
  if (request.operation === "import") {
    if (!request.json) throw new Error("Bookmark JSON is required for import.");
    volume.writeFileSync(JSON_PATH, request.json, { encoding: "utf8" });
  }
  configureGoGlobals(volume, logs);

  const go = new (globalThis as GoWorkerGlobal).Go();
  let exitCode = 0;
  go.argv = buildBookmarkArguments(request.operation);
  go.env = { HOME: TEMP_DIRECTORY, TMPDIR: TEMP_DIRECTORY };
  go.exit = (code) => {
    exitCode = code;
  };

  self.postMessage({ type: "progress", stage: "loading-engine" });
  const instance = await instantiatePdfCpu(go);
  self.postMessage({
    type: "progress",
    stage: request.operation,
  } satisfies { type: "progress"; stage: PdfBookmarkStage });
  await go.run(instance);
  const log = logs.join("");

  if (request.operation === "export") {
    if (exitCode !== 0) {
      if (isNoBookmarksDiagnostic(log)) {
        self.postMessage({
          type: "result",
          json: '{"bookmarks":[]}',
          log: "",
        });
        return;
      }
      self.postMessage({
        type: "error",
        message: "pdfcpu could not inspect this PDF's bookmarks.",
        log,
      });
      return;
    }
    const json = volume.existsSync(JSON_PATH)
      ? String(volume.readFileSync(JSON_PATH, "utf8"))
      : '{"bookmarks":[]}';
    self.postMessage({ type: "result", json, log });
    return;
  }

  if (exitCode !== 0 || !volume.existsSync(OUTPUT_PATH)) {
    self.postMessage({
      type: "error",
      message: `pdfcpu could not ${request.operation} this PDF's bookmarks.`,
      log,
    });
    return;
  }
  const output = volume.readFileSync(OUTPUT_PATH) as Uint8Array;
  if (output.byteLength > MAX_OUTPUT_BYTES) {
    throw new Error("The bookmarked PDF exceeds the 512 MB browser limit.");
  }
  const transferable = new Uint8Array(output.byteLength);
  transferable.set(output);
  self.postMessage({ type: "result", bytes: transferable.buffer, log }, [
    transferable.buffer,
  ]);
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  try {
    await runCommand(event.data);
  } catch (cause) {
    self.postMessage({
      type: "error",
      message:
        cause instanceof Error
          ? cause.message
          : "The PDF bookmarks could not be processed.",
      log: "",
    });
  }
};

export {};
