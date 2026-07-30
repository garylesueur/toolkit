"use client";

import { useEffect, useMemo, useState } from "react";

import { renderMarkdown } from "@/lib/shared/markdown";

/**
 * Sanitised markdown preview HTML.
 *
 * Sanitising requires a DOM, so the first render — the one the server produces
 * and the client hydrates against — deliberately yields an empty string. Both
 * sides agree on that, which keeps hydration clean; the real preview appears on
 * the commit straight after mount and updates synchronously from then on.
 */
export function useSanitisedMarkdown(source: string): string {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return useMemo(
    () => (mounted ? renderMarkdown(source) : ""),
    [mounted, source],
  );
}
