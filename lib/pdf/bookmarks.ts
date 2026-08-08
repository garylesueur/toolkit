import {
  bookmarkImportJson,
  countPdfBookmarks,
  parsePdfCpuBookmarkExport,
  validatePdfBookmarks,
  type PdfBookmark,
  type PdfBookmarkOperation,
} from "./bookmarks-options";
import { cleanPdfCpuLog } from "./pdf-health-options";

export type PdfBookmarkStage =
  | "loading-engine"
  | "export"
  | "import"
  | "remove"
  | "verifying";

type WorkerResult = {
  bytes?: ArrayBuffer;
  json?: string;
  log: string;
  type: "result";
};
type WorkerError = { log: string; message: string; type: "error" };
type WorkerProgress = { stage: PdfBookmarkStage; type: "progress" };

function abortError(): DOMException {
  return new DOMException("PDF bookmark operation cancelled.", "AbortError");
}

function sourceBuffer(source: Uint8Array): ArrayBuffer {
  return source.buffer.slice(
    source.byteOffset,
    source.byteOffset + source.byteLength,
  ) as ArrayBuffer;
}

function runBookmarkWorker(
  operation: PdfBookmarkOperation,
  source: Uint8Array,
  options: {
    json?: string;
    onStage?: (stage: PdfBookmarkStage) => void;
    signal?: AbortSignal;
  } = {},
): Promise<WorkerResult> {
  if (!source.byteLength) {
    return Promise.reject(new Error("Choose a non-empty PDF first."));
  }
  if (options.signal?.aborted) return Promise.reject(abortError());
  const bytes = sourceBuffer(source);
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./bookmarks.worker.ts", import.meta.url),
      {
        type: "module",
      },
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
      fail(new Error(event.message || "The PDF bookmark worker stopped."));
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
              "The PDF bookmarks could not be processed.",
          ),
        );
        return;
      }
      if (settled) return;
      settled = true;
      finish();
      resolve({ ...message, log: cleanPdfCpuLog(message.log) });
    };
    worker.postMessage({ bytes, json: options.json, operation }, [bytes]);
  });
}

export async function exportPdfBookmarks(
  source: Uint8Array,
  pageCount: number,
  options: {
    onStage?: (stage: PdfBookmarkStage) => void;
    signal?: AbortSignal;
  } = {},
): Promise<PdfBookmark[]> {
  const result = await runBookmarkWorker("export", source, options);
  if (!result.json) return [];
  return parsePdfCpuBookmarkExport(result.json, pageCount);
}

export async function replacePdfBookmarks(
  source: Uint8Array,
  pageCount: number,
  bookmarks: PdfBookmark[],
  options: {
    onStage?: (stage: PdfBookmarkStage) => void;
    signal?: AbortSignal;
  } = {},
): Promise<Uint8Array> {
  const validated = validatePdfBookmarks(bookmarks, pageCount);
  if (!validated.length) throw new Error("Add at least one bookmark first.");
  const result = await runBookmarkWorker("import", source, {
    ...options,
    json: bookmarkImportJson(validated),
  });
  if (!result.bytes) throw new Error("The bookmark engine produced no PDF.");
  const bytes = new Uint8Array(result.bytes);
  options.onStage?.("verifying");
  const after = await exportPdfBookmarks(bytes, pageCount, {
    signal: options.signal,
  });
  if (JSON.stringify(after) !== JSON.stringify(validated)) {
    throw new Error("Bookmark verification found a tree mismatch.");
  }
  return bytes;
}

export async function removeAllPdfBookmarks(
  source: Uint8Array,
  pageCount: number,
  options: {
    onStage?: (stage: PdfBookmarkStage) => void;
    signal?: AbortSignal;
  } = {},
): Promise<Uint8Array> {
  const before = await exportPdfBookmarks(source, pageCount, options);
  if (countPdfBookmarks(before) === 0) {
    throw new Error("This PDF has no bookmarks to remove.");
  }
  const result = await runBookmarkWorker("remove", source, options);
  if (!result.bytes) throw new Error("The bookmark engine produced no PDF.");
  const bytes = new Uint8Array(result.bytes);
  options.onStage?.("verifying");
  const after = await exportPdfBookmarks(bytes, pageCount, {
    signal: options.signal,
  });
  if (countPdfBookmarks(after) !== 0) {
    throw new Error("Bookmark removal verification found remaining bookmarks.");
  }
  return bytes;
}
