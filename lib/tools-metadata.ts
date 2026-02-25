import type { Metadata } from "next";
import { tools } from "@/lib/tools";

const BASE_URL = "https://toolkit.lesueur.uk";

/**
 * Generates a Next.js `Metadata` object for a tool page.
 * Looks up the tool by its URL slug (the last segment of its href).
 */
export function createToolMetadata(slug: string): Metadata {
  const tool = tools.find((t) => t.href === `/tools/${slug}`);

  if (!tool) {
    return {
      title: "Tool Not Found",
    };
  }

  const url = `${BASE_URL}${tool.href}`;

  return {
    title: tool.name,
    description: tool.description,
    openGraph: {
      title: tool.name,
      description: tool.description,
      url,
    },
    alternates: {
      canonical: url,
    },
  };
}
