import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site";
import { visibleTools } from "@/lib/tools";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();

  const toolEntries: MetadataRoute.Sitemap = visibleTools.map((tool) => ({
    url: `${baseUrl}${tool.href}`,
    ...(tool.dateAdded ? { lastModified: new Date(tool.dateAdded) } : {}),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // `visibleTools` is sorted newest-first, so the head is the latest addition.
  const newestToolDate = visibleTools[0]?.dateAdded;

  return [
    {
      url: baseUrl,
      ...(newestToolDate ? { lastModified: new Date(newestToolDate) } : {}),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    ...toolEntries,
  ];
}
