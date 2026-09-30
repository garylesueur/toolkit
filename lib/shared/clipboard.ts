export type CopyFeedback = { copiedValue: string | null; error: string | null };
export const EMPTY_COPY_FEEDBACK: CopyFeedback = {
  copiedValue: null,
  error: null,
};
const COPY_FEEDBACK_MS = 2000;
export const COPY_FAILURE_MESSAGE =
  "Could not copy. Select the content and copy it manually.";

type ClipboardOptions = {
  write: (value: string) => Promise<void>;
  publish: (feedback: CopyFeedback) => void;
  schedule?: (callback: () => void) => ReturnType<typeof setTimeout>;
  unschedule?: (timer: ReturnType<typeof setTimeout>) => void;
};
export function createClipboardController(options: ClipboardOptions) {
  let generation = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const cancel = () => {
    generation++;
    if (timer !== null) (options.unschedule ?? clearTimeout)(timer);
    timer = null;
  };
  const reset = () => {
    cancel();
    options.publish(EMPTY_COPY_FEEDBACK);
  };
  const copy = async (value: string) => {
    reset();
    const request = generation;
    try {
      await options.write(value);
      if (request !== generation) return;
      options.publish({ copiedValue: value, error: null });
      const clear = () => {
        if (request === generation) {
          timer = null;
          options.publish(EMPTY_COPY_FEEDBACK);
        }
      };
      timer = options.schedule
        ? options.schedule(clear)
        : setTimeout(clear, COPY_FEEDBACK_MS);
    } catch {
      if (request === generation)
        options.publish({ copiedValue: null, error: COPY_FAILURE_MESSAGE });
    }
  };
  return { copy, reset, cancel };
}
