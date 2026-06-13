import { canonicalPath, getSiteUrl } from "@/lib/site";
import { tools } from "@/lib/tools";

import type { JsonLdDocument } from "./types";

/** `BreadcrumbList` for a tool page under `/tools/<slug>`. */
export function createToolBreadcrumbJsonLd(slug: string): JsonLdDocument | null {
  const tool = tools.find((entry) => entry.href === `/tools/${slug}`);
  if (!tool) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: getSiteUrl(),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: tool.name,
        item: canonicalPath(tool.href),
      },
    ],
  };
}
