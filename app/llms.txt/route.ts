import { createLlmsTxt } from "@/lib/seo/llms-txt";

/** Generated at build time from the tool registry — never served stale. */
export const dynamic = "force-static";

export function GET(): Response {
  return new Response(createLlmsTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
