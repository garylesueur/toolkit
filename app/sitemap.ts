import type { MetadataRoute } from "next";
import { tools } from "@/lib/tools";

const BASE_URL = "https://toolkit.lesueur.uk";

export default function sitemap(): MetadataRoute.Sitemap {
  const toolEntries: MetadataRoute.Sitemap = tools.map((tool) => ({
    url: `${BASE_URL}${tool.href}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    {
      url: BASE_URL,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    ...toolEntries,
  ];
}
