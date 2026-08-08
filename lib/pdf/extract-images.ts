import { extractedImageMetadata } from "./extract-images-options";
import { cleanPdfCpuLog } from "./pdf-health-options";

export type PdfImageExtractionStage =
  | "loading-engine"
  | "extracting"
  | "collecting";

export type ExtractedPdfImage = {
  name: string;
  bytes: Uint8Array;
  size: number;
  mimeType: string;
  previewable: boolean;
};

type WorkerFile = { name: string; bytes: ArrayBuffer };
type WorkerResult = { type: "result"; files: WorkerFile[]; log: string };
type WorkerError = { type: "error"; message: string; log: string };
type WorkerProgress = { type: "progress"; stage: PdfImageExtractionStage };

function abortError(): DOMException {
  return new DOMException("PDF image extraction cancelled.", "AbortError");
}

function sourceBuffer(source: Uint8Array): ArrayBuffer {
  return source.buffer.slice(
    source.byteOffset,
    source.byteOffset + source.byteLength,
  ) as ArrayBuffer;
}

export function extractPdfImages(
  source: Uint8Array,
  pages: number[],
  options: {
    signal?: AbortSignal;
    onStage?: (stage: PdfImageExtractionStage) => void;
  } = {},
): Promise<ExtractedPdfImage[]> {
  if (!source.byteLength) {
    return Promise.reject(new Error("Choose a non-empty PDF first."));
  }
  if (options.signal?.aborted) return Promise.reject(abortError());
  const bytes = sourceBuffer(source);

  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./extract-images.worker.ts", import.meta.url),
      { type: "module" },
    );
    let settled = false;
    const finish = () => {
      options.signal?.removeEventListener("abort", cancel);
      worker.terminate();
    };
    const fail = (cause: unknown) => {
      if (settled) return;
      settled = true;
      finish();
      reject(cause);
    };
    const cancel = () => fail(abortError());
    options.signal?.addEventListener("abort", cancel, { once: true });

    worker.onerror = (event) => {
      fail(new Error(event.message || "The PDF image worker stopped."));
    };
    worker.onmessage = (
      event: MessageEvent<WorkerResult | WorkerError | WorkerProgress>,
    ) => {
      const message = event.data;
      if (message.type === "progress") {
        options.onStage?.(message.stage);
        return;
      }
      if (message.type === "error") {
        fail(
          new Error(
            cleanPdfCpuLog(message.log) ||
              message.message ||
              "The PDF images could not be extracted.",
          ),
        );
        return;
      }
      if (settled) return;
      settled = true;
      finish();
      resolve(
        message.files.map((file) => {
          const metadata = extractedImageMetadata(file.name);
          const imageBytes = new Uint8Array(file.bytes);
          return {
            ...metadata,
            bytes: imageBytes,
            size: imageBytes.byteLength,
          };
        }),
      );
    };
    worker.postMessage({ bytes, pages }, [bytes]);
  });
}
