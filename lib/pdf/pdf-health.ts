import type { PdfCpuCommand, PdfValidationMode } from "./pdf-health-options";
import { cleanPdfCpuLog } from "./pdf-health-options";

export type PdfHealthStage =
  | "loading-engine"
  | "validating"
  | "repairing"
  | "verifying";

export type PdfValidationResult = {
  valid: boolean;
  mode: PdfValidationMode;
  log: string;
  byteLength: number;
};

export type PdfRepairResult = {
  bytes: Uint8Array;
  validation: PdfValidationResult;
};

type WorkerResult = {
  type: "result";
  valid: boolean;
  log: string;
  bytes?: ArrayBuffer;
};

type WorkerError = { type: "error"; message: string; log: string };

function sourceBuffer(source: Uint8Array): ArrayBuffer {
  return source.buffer.slice(
    source.byteOffset,
    source.byteOffset + source.byteLength,
  ) as ArrayBuffer;
}

function runPdfCpu(
  command: PdfCpuCommand,
  source: Uint8Array,
  mode: PdfValidationMode,
  onStage?: (stage: PdfHealthStage) => void,
): Promise<WorkerResult> {
  const bytes = sourceBuffer(source);

  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./pdf-health.worker.ts", import.meta.url),
      { type: "module" },
    );
    const finish = () => worker.terminate();

    worker.onerror = (event) => {
      finish();
      reject(
        new Error(event.message || "The PDF engine stopped unexpectedly."),
      );
    };
    worker.onmessage = (
      event: MessageEvent<
        WorkerResult | WorkerError | { type: "progress"; stage: PdfHealthStage }
      >,
    ) => {
      const message = event.data;
      if (message.type === "progress") {
        onStage?.(message.stage);
        return;
      }
      finish();
      if (message.type === "error") {
        reject(
          new Error(
            cleanPdfCpuLog(message.log) ||
              message.message ||
              "The PDF could not be processed.",
          ),
        );
        return;
      }
      resolve({ ...message, log: cleanPdfCpuLog(message.log) });
    };

    worker.postMessage({ command, mode, bytes }, [bytes]);
  });
}

export async function validatePdf(
  source: Uint8Array,
  mode: PdfValidationMode,
  onStage?: (stage: PdfHealthStage) => void,
): Promise<PdfValidationResult> {
  if (!source.byteLength) throw new Error("Choose a non-empty PDF first.");
  const result = await runPdfCpu("validate", source, mode, onStage);
  return {
    valid: result.valid,
    mode,
    log: result.log,
    byteLength: source.byteLength,
  };
}

export async function repairPdf(
  source: Uint8Array,
  mode: PdfValidationMode,
  onStage?: (stage: PdfHealthStage) => void,
): Promise<PdfRepairResult> {
  if (!source.byteLength) throw new Error("Choose a non-empty PDF first.");
  const repaired = await runPdfCpu("repair", source, mode, onStage);
  if (!repaired.bytes) throw new Error("The repair engine produced no PDF.");

  const bytes = new Uint8Array(repaired.bytes);
  const validation = await validatePdf(bytes, mode, () =>
    onStage?.("verifying"),
  );
  if (!validation.valid) {
    throw new Error(
      validation.log || "The rebuilt PDF still does not pass validation.",
    );
  }
  return { bytes, validation };
}
