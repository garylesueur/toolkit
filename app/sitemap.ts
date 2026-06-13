import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site";
import { visibleTools } from "@/lib/tools";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();

  const toolEntries: MetadataRoute.Sitemap = visibleTools.map((tool) => ({
    url: `${baseUrl}${tool.href}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    ...toolEntries,
  ];
}
