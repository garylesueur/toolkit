import type { Metadata } from "next";

import { ROOT_OG_IMAGE, ROOT_OG_IMAGE_PATH } from "@/lib/seo/root-og-image";
import { canonicalPath } from "@/lib/site";
import { tools } from "@/lib/tools";

/** Per-tool share image, prerendered by `app/api/og/[slug]/route.tsx`. */
function toolOpenGraphImagePath(slug: string): string {
  return `/api/og/${slug}`;
}

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
        url: canonicalPath("/"),
        images: [ROOT_OG_IMAGE],
      },
      twitter: {
        card: "summary_large_image",
        title: "Tool not found",
        description: "That toolkit page does not exist.",
        images: [ROOT_OG_IMAGE_PATH],
      },
      alternates: {
        canonical: "/",
      },
    };
  }

  const imagePath = toolOpenGraphImagePath(slug);

  return {
    title: tool.name,
    description: tool.description,
    openGraph: {
      title: tool.name,
      description: tool.description,
      url: canonicalPath(tool.href),
      images: [
        {
          url: imagePath,
          width: 1200,
          height: 630,
          alt: `${tool.name} — Toolkit`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: tool.name,
      description: tool.description,
      images: [imagePath],
    },
    alternates: {
      canonical: tool.href,
    },
  };
}
