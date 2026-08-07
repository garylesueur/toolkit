/// <reference lib="webworker" />

import { createFsFromVolume, Volume } from "memfs";

import "./vendor/wasm_exec.js";
import type { CompressStage } from "./compress";

const PDFCPU_WASM_URL = "/vendor/pdfcpu/pdfcpu.wasm";
const INPUT_PATH = "/input.pdf";
const OUTPUT_PATH = "/output.pdf";
const TEMP_DIRECTORY = "/tmp";

type WorkerRequest = {
  type: "compress";
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

function postProgress(stage: CompressStage): void {
  self.postMessage({ type: "progress", stage });
}

function createGoFileSystem(volume: Volume): object {
  const memoryFs = createFsFromVolume(volume);
  const decoder = new TextDecoder();

  return new Proxy(memoryFs, {
    get(target, property, receiver) {
      if (property === "writeSync") {
        return (fd: number, buffer: Uint8Array): number => {
          if (fd === 1 || fd === 2) {
            const line = decoder.decode(buffer).trim();
            if (line) console.debug(`[pdfcpu] ${line}`);
            return buffer.byteLength;
          }
          return target.writeSync(fd, buffer);
        };
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
            const line = decoder
              .decode(buffer.subarray(offset, offset + length))
              .trim();
            if (line) console.debug(`[pdfcpu] ${line}`);
            callback(null, length);
            return;
          }
          // memfs uses -1 for the descriptor's current position; Node's fs
          // API (and the Go runtime) express the same behaviour as null.
          target.write(fd, buffer, offset, length, position ?? -1, callback);
        };
      }

      return Reflect.get(target, property, receiver);
    },
  });
}

function configureGoGlobals(volume: Volume): void {
  Reflect.set(globalThis, "fs", createGoFileSystem(volume));
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
    throw new Error("The PDF compression engine could not be loaded.");
  }

  if (WebAssembly.instantiateStreaming) {
    try {
      const result = await WebAssembly.instantiateStreaming(
        response.clone(),
        go.importObject,
      );
      return result.instance;
    } catch {
      // Static hosts occasionally serve WASM with the wrong MIME type.
    }
  }

  const result = await WebAssembly.instantiate(
    await response.arrayBuffer(),
    go.importObject,
  );
  return result.instance;
}

async function optimisePdf(sourceBuffer: ArrayBuffer): Promise<ArrayBuffer> {
  const volume = new Volume();
  volume.mkdirSync(TEMP_DIRECTORY);
  volume.writeFileSync(INPUT_PATH, new Uint8Array(sourceBuffer));
  configureGoGlobals(volume);

  const globals = globalThis as GoWorkerGlobal;
  const go = new globals.Go();
  let exitCode = 0;
  go.argv = [
    "pdfcpu",
    "optimize",
    "--conf",
    "disable",
    INPUT_PATH,
    OUTPUT_PATH,
  ];
  go.env = { HOME: TEMP_DIRECTORY, TMPDIR: TEMP_DIRECTORY };
  go.exit = (code) => {
    exitCode = code;
  };

  postProgress("loading-engine");
  const instance = await instantiatePdfCpu(go);
  postProgress("optimising");
  await go.run(instance);

  if (exitCode !== 0 || !volume.existsSync(OUTPUT_PATH)) {
    throw new Error("pdfcpu could not optimise this PDF.");
  }

  postProgress("verifying");
  const output = volume.readFileSync(OUTPUT_PATH) as Uint8Array;
  const transferableOutput = new Uint8Array(output.byteLength);
  transferableOutput.set(output);
  return transferableOutput.buffer;
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  if (event.data.type !== "compress") return;

  try {
    const output = await optimisePdf(event.data.bytes);
    self.postMessage({ type: "result", bytes: output }, [output]);
  } catch (error) {
    self.postMessage({
      type: "error",
      message:
        error instanceof Error ? error.message : "PDF compression failed.",
    });
  }
};

export {};
