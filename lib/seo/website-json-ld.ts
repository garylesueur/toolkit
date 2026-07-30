import { canonicalPath, getSiteUrl } from "@/lib/site";

import type { JsonLdDocument } from "./types";

/** Site-wide `WebSite` schema with on-page search (`?q=` on the home page). */
export function createWebSiteJsonLd(): JsonLdDocument {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Toolkit",
    "url": getSiteUrl(),
    "description":
      "A growing collection of handy developer utilities — no sign-ups, no nonsense.",
    "author": {
      "@type": "Person",
      "name": "Gary Le Sueur",
    },
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${canonicalPath("/")}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}
