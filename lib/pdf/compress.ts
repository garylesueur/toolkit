export type CompressStage = "loading-engine" | "optimising" | "verifying";

export type CompressProgress = {
  stage: CompressStage;
};

export type CompressResult = {
  bytes: Uint8Array;
  originalSize: number;
  compressedSize: number;
  savedSize: number;
  usedOriginal: boolean;
};

type CompressWorkerProgress = {
  type: "progress";
  stage: CompressStage;
};

type CompressWorkerResult = {
  type: "result";
  bytes: ArrayBuffer;
};

type CompressWorkerError = {
  type: "error";
  message: string;
};

type CompressWorkerMessage =
  | CompressWorkerProgress
  | CompressWorkerResult
  | CompressWorkerError;

/**
 * Optimise a PDF with pdfcpu running inside a disposable Web Worker.
 * The worker owns the source buffer so large files are not copied between
 * threads, and termination releases the Go/WASM heap after each run.
 */
export function compressPdf(
  sourceBytes: Uint8Array,
  onProgress?: (progress: CompressProgress) => void,
): Promise<CompressResult> {
  const originalSize = sourceBytes.byteLength;
  const sourceBuffer = sourceBytes.buffer.slice(
    sourceBytes.byteOffset,
    sourceBytes.byteOffset + sourceBytes.byteLength,
  );

  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./compress.worker.ts", import.meta.url),
      {
        type: "module",
      },
    );

    const finish = (): void => worker.terminate();

    worker.onerror = (event) => {
      finish();
      reject(new Error(event.message || "PDF compression failed."));
    };

    worker.onmessage = (event: MessageEvent<CompressWorkerMessage>) => {
      const message = event.data;

      if (message.type === "progress") {
        onProgress?.({ stage: message.stage });
        return;
      }

      if (message.type === "error") {
        finish();
        reject(new Error(message.message));
        return;
      }

      const optimisedBytes = new Uint8Array(message.bytes);
      const usedOriginal = optimisedBytes.byteLength >= originalSize;
      const bytes = usedOriginal
        ? new Uint8Array(sourceBuffer)
        : optimisedBytes;
      finish();
      resolve({
        bytes,
        originalSize,
        compressedSize: bytes.byteLength,
        savedSize: originalSize - bytes.byteLength,
        usedOriginal,
      });
    };

    worker.postMessage({ type: "compress", bytes: sourceBuffer }, [
      sourceBuffer,
    ]);
  });
}
