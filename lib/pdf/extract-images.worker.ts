/// <reference lib="webworker" />

import { createFsFromVolume, Volume } from "memfs";

import "./vendor/wasm_exec.js";
import {
  MAX_EXTRACTED_IMAGE_BYTES,
  MAX_EXTRACTED_IMAGES,
  buildResourceExtractionArguments,
  sortExtractedImageNames,
} from "./extract-images-options";
import type { PdfExtractableResource } from "./extract-images-options";

const PDFCPU_WASM_URL = "/vendor/pdfcpu/pdfcpu.wasm";
const INPUT_PATH = "/input.pdf";
const TEMP_DIRECTORY = "/tmp";

type WorkerRequest = {
  bytes: ArrayBuffer;
  pages: number[];
  resource: PdfExtractableResource;
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
    throw new Error("The local PDF resource engine could not be loaded.");
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

async function runExtraction(request: WorkerRequest): Promise<void> {
  const volume = new Volume();
  const logs: string[] = [];
  const outputDirectory = request.resource === "image" ? "/images" : "/fonts";
  volume.mkdirSync(TEMP_DIRECTORY);
  volume.mkdirSync(outputDirectory);
  volume.writeFileSync(INPUT_PATH, new Uint8Array(request.bytes));
  configureGoGlobals(volume, logs);

  const go = new (globalThis as GoWorkerGlobal).Go();
  let exitCode = 0;
  go.argv = buildResourceExtractionArguments(request.resource, request.pages);
  go.env = { HOME: TEMP_DIRECTORY, TMPDIR: TEMP_DIRECTORY };
  go.exit = (code) => {
    exitCode = code;
  };

  self.postMessage({ type: "progress", stage: "loading-engine" });
  const instance = await instantiatePdfCpu(go);
  self.postMessage({ type: "progress", stage: "extracting" });
  await go.run(instance);
  const log = logs.join("");
  if (exitCode !== 0) {
    self.postMessage({
      type: "error",
      message: `pdfcpu could not extract ${request.resource}s from this PDF.`,
      log,
    });
    return;
  }

  self.postMessage({ type: "progress", stage: "collecting" });
  const names = sortExtractedImageNames(
    (volume.readdirSync(outputDirectory) as string[]).filter((name) => {
      const path = `${outputDirectory}/${name}`;
      return volume.statSync(path).isFile();
    }),
  );
  if (names.length > MAX_EXTRACTED_IMAGES) {
    throw new Error(
      `This PDF contains more than ${MAX_EXTRACTED_IMAGES} extractable resources. Select fewer pages.`,
    );
  }

  let totalBytes = 0;
  const transfer: ArrayBuffer[] = [];
  const files = names.map((name) => {
    const output = volume.readFileSync(
      `${outputDirectory}/${name}`,
    ) as Uint8Array;
    totalBytes += output.byteLength;
    if (totalBytes > MAX_EXTRACTED_IMAGE_BYTES) {
      throw new Error(
        "The extracted resources exceed the 512 MB in-browser safety limit. Select fewer pages.",
      );
    }
    const bytes = new Uint8Array(output.byteLength);
    bytes.set(output);
    transfer.push(bytes.buffer);
    return { name, bytes: bytes.buffer };
  });
  self.postMessage({ type: "result", files, log }, transfer);
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  try {
    await runExtraction(event.data);
  } catch (cause) {
    self.postMessage({
      type: "error",
      message:
        cause instanceof Error
          ? cause.message
          : "The PDF resources could not be extracted.",
      log: "",
    });
  }
};

export {};
