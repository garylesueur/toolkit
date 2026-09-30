"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createClipboardController,
  EMPTY_COPY_FEEDBACK,
} from "@/lib/shared/clipboard";

export function useClipboard(value: string) {
  const [feedback, setFeedback] = useState(EMPTY_COPY_FEEDBACK);
  const controller = useMemo(
    () =>
      createClipboardController({
        write: (text) => navigator.clipboard.writeText(text),
        publish: setFeedback,
      }),
    [],
  );
  useEffect(() => {
    controller.reset();
    return () => controller.cancel();
  }, [controller, value]);
  const copy = useCallback(() => controller.copy(value), [controller, value]);
  return {
    copy,
    copied: feedback.copiedValue === value,
    error: feedback.error,
  };
}
