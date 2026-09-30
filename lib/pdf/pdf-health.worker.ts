/// <reference lib="webworker" />

import { createFsFromVolume, Volume } from "memfs";

import "./vendor/wasm_exec.js";
import type { PdfHealthStage } from "./pdf-health";
import { buildPdfCpuArguments } from "./pdf-health-options";
import type { PdfCpuCommand, PdfValidationMode } from "./pdf-health-options";

const PDFCPU_WASM_URL = "/vendor/pdfcpu/pdfcpu.wasm";
const INPUT_PATH = "/input.pdf";
const OUTPUT_PATH = "/output.pdf";
const TEMP_DIRECTORY = "/tmp";

type WorkerRequest = {
  command: PdfCpuCommand;
  mode: PdfValidationMode;
  bytes: ArrayBuffer;
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
  if (!response.ok)
    throw new Error("The local PDF engine could not be loaded.");
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

async function runCommand(request: WorkerRequest) {
  const volume = new Volume();
  const logs: string[] = [];
  volume.mkdirSync(TEMP_DIRECTORY);
  volume.writeFileSync(INPUT_PATH, new Uint8Array(request.bytes));
  configureGoGlobals(volume, logs);

  const go = new (globalThis as GoWorkerGlobal).Go();
  let exitCode = 0;
  go.argv = buildPdfCpuArguments(request.command, request.mode);
  go.env = { HOME: TEMP_DIRECTORY, TMPDIR: TEMP_DIRECTORY };
  go.exit = (code) => {
    exitCode = code;
  };

  self.postMessage({ type: "progress", stage: "loading-engine" });
  const instance = await instantiatePdfCpu(go);
  self.postMessage({
    type: "progress",
    stage: request.command === "validate" ? "validating" : "repairing",
  } satisfies { type: "progress"; stage: PdfHealthStage });
  await go.run(instance);
  const log = logs.join("");

  if (request.command === "validate") {
    self.postMessage({ type: "result", valid: exitCode === 0, log });
    return;
  }
  if (exitCode !== 0 || !volume.existsSync(OUTPUT_PATH)) {
    self.postMessage({
      type: "error",
      message: "pdfcpu could not rebuild this PDF.",
      log,
    });
    return;
  }

  const output = volume.readFileSync(OUTPUT_PATH) as Uint8Array;
  const transferable = new Uint8Array(output.byteLength);
  transferable.set(output);
  self.postMessage(
    { type: "result", valid: true, log, bytes: transferable.buffer },
    [transferable.buffer],
  );
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  try {
    await runCommand(event.data);
  } catch (error) {
    self.postMessage({
      type: "error",
      message:
        error instanceof Error
          ? error.message
          : "The PDF could not be processed.",
      log: "",
    });
  }
};

export {};
