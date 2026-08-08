import {
  buildProtectArguments,
  buildUnlockArguments,
  validatePdfPassword,
  validateProtectOptions,
  type ProtectPdfOptions,
} from "./pdf-password-options";

export type PdfPasswordStage = "loading-engine" | "protecting" | "unlocking";

type WorkerResult = { type: "result"; bytes: ArrayBuffer };
type WorkerError = { type: "error"; message: string };

function runPasswordCommand(
  source: Uint8Array,
  args: string[],
  operation: "protect" | "unlock",
  onStage?: (stage: PdfPasswordStage) => void,
): Promise<Uint8Array> {
  const bytes = source.buffer.slice(
    source.byteOffset,
    source.byteOffset + source.byteLength,
  ) as ArrayBuffer;

  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./pdf-password.worker.ts", import.meta.url),
      { type: "module" },
    );
    const finish = () => worker.terminate();
    worker.onerror = (event) => {
      finish();
      reject(new Error(event.message || "The local PDF engine stopped."));
    };
    worker.onmessage = (
      event: MessageEvent<
        | WorkerResult
        | WorkerError
        | { type: "progress"; stage: PdfPasswordStage }
      >,
    ) => {
      const message = event.data;
      if (message.type === "progress") {
        onStage?.(message.stage);
        return;
      }
      finish();
      if (message.type === "error") reject(new Error(message.message));
      else resolve(new Uint8Array(message.bytes));
    };
    worker.postMessage({ args, bytes, operation }, [bytes]);
  });
}

export async function protectPdf(
  source: Uint8Array,
  options: ProtectPdfOptions,
  onStage?: (stage: PdfPasswordStage) => void,
): Promise<Uint8Array> {
  if (!source.byteLength) throw new Error("Choose a non-empty PDF first.");
  validateProtectOptions(options);
  return runPasswordCommand(
    source,
    buildProtectArguments(options),
    "protect",
    onStage,
  );
}

export async function unlockPdf(
  source: Uint8Array,
  password: string,
  onStage?: (stage: PdfPasswordStage) => void,
): Promise<Uint8Array> {
  if (!source.byteLength) throw new Error("Choose a non-empty PDF first.");
  validatePdfPassword(password, "PDF password");
  try {
    return await runPasswordCommand(
      source,
      buildUnlockArguments(password, "user"),
      "unlock",
      onStage,
    );
  } catch {
    try {
      return await runPasswordCommand(
        source,
        buildUnlockArguments(password, "owner"),
        "unlock",
        onStage,
      );
    } catch {
      throw new Error(
        "The password is incorrect or this PDF is not supported.",
      );
    }
  }
}
