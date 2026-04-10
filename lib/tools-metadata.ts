import type { Metadata } from "next";

import { tools } from "@/lib/tools";

const BASE_URL = "https://toolkit.lesueur.uk";

/** Path to the segment Open Graph image (`app/tools/opengraph-image.tsx`). */
const TOOL_OPENGRAPH_IMAGE_PATH = "/tools/opengraph-image";

const TOOL_OPENGRAPH_IMAGE = {
  url: TOOL_OPENGRAPH_IMAGE_PATH,
  width: 1200,
  height: 630,
  alt: "Toolkit — Developer utilities",
} as const;

/**
 * Generates a Next.js `Metadata` object for a tool page.
 * Looks up the tool by its URL slug (the last segment of its href).
 */
export function createToolMetadata(slug: string): Metadata {
  const tool = tools.find((t) => t.href === `/tools/${slug}`);

  if (!tool) {
    return {
      title: "Tool not found",
      description: "That toolkit page does not exist.",
      robots: { index: false, follow: true },
      openGraph: {
        title: "Tool not found",
        description: "That toolkit page does not exist.",
        url: BASE_URL,
        images: [TOOL_OPENGRAPH_IMAGE],
      },
      twitter: {
        card: "summary_large_image",
        title: "Tool not found",
        description: "That toolkit page does not exist.",
        images: [TOOL_OPENGRAPH_IMAGE_PATH],
      },
      alternates: {
        canonical: BASE_URL,
      },
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
      images: [TOOL_OPENGRAPH_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: tool.name,
      description: tool.description,
      images: [TOOL_OPENGRAPH_IMAGE_PATH],
    },
    alternates: {
      canonical: url,
    },
  };
}
