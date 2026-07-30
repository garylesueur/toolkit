"use client";

import { useEffect, useRef, useState } from "react";

import type {
  RegexRequest,
  RegexResponse,
  RegexResult,
} from "@/lib/regex-tester/types";

/** A pattern still running after this is treated as catastrophic backtracking. */
const MATCH_TIMEOUT_MS = 1000;

const EMPTY: RegexResult = { matches: [], error: null };

const TIMEOUT_RESULT: RegexResult = {
  matches: [],
  error:
    "This pattern took too long to run — it likely backtracks catastrophically on this input.",
  timedOut: true,
};

function createWorker(): Worker {
  return new Worker(
    new URL("@/lib/regex-tester/regex.worker.ts", import.meta.url),
  );
}

/**
 * Matches in a Web Worker so a pathological pattern cannot freeze the page.
 * The worker is terminated (and replaced) on timeout, since a regex engine
 * stuck in backtracking will not respond to any co-operative cancellation.
 */
export function useRegexMatches(
  pattern: string,
  flags: string,
  testString: string,
): RegexResult {
  const [result, setResult] = useState<RegexResult>(EMPTY);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!pattern) {
      setResult(EMPTY);
      return;
    }

    if (!workerRef.current) workerRef.current = createWorker();
    const worker = workerRef.current;
    const id = ++requestIdRef.current;

    const timer = setTimeout(() => {
      if (id !== requestIdRef.current) return;
      // The thread is wedged; the only way back is to throw it away.
      worker.terminate();
      workerRef.current = null;
      setResult(TIMEOUT_RESULT);
    }, MATCH_TIMEOUT_MS);

    const handleMessage = (event: MessageEvent<RegexResponse>) => {
      if (event.data.id !== requestIdRef.current) return;
      clearTimeout(timer);
      const { id: _id, ...rest } = event.data;
      setResult(rest);
    };

    worker.addEventListener("message", handleMessage);

    const request: RegexRequest = { id, pattern, flags, testString };
    worker.postMessage(request);

    return () => {
      clearTimeout(timer);
      worker.removeEventListener("message", handleMessage);
    };
  }, [pattern, flags, testString]);

  return result;
}
