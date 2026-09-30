import { getSiteUrl } from "@/lib/site";
import { visibleTools } from "@/lib/tools";
import type { Tool } from "@/lib/tools";

/**
 * Human-readable section headings for tag slugs. A tag missing from this map
 * falls back to a title-cased version of the slug itself.
 */
const TAG_HEADINGS: Record<string, string> = {
  "colour": "Colour",
  "conversion": "Conversion",
  "data": "Data",
  "date-time": "Date & time",
  "dev-utils": "Developer utilities",
  "encoding": "Encoding & decoding",
  "formatting": "Formatting",
  "generation": "Generators",
  "image": "Images",
  "network": "Network",
  "pdf": "PDF",
  "security": "Security",
  "seo": "SEO & social",
  "text": "Text",
};

function headingFor(tag: string): string {
  const known = TAG_HEADINGS[tag];
  if (known) return known;
  return tag
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Each tool is listed once, under its first tag. */
function groupByPrimaryTag(tools: Tool[]): Map<string, Tool[]> {
  const groups = new Map<string, Tool[]>();

  for (const tool of tools) {
    const primaryTag = tool.tags[0] ?? "dev-utils";
    const existing = groups.get(primaryTag);
    if (existing) {
      existing.push(tool);
    } else {
      groups.set(primaryTag, [tool]);
    }
  }

  for (const group of groups.values()) {
    group.sort((a, b) => a.name.localeCompare(b.name));
  }

  return groups;
}

/**
 * Builds `/llms.txt` from the tool registry so it can never drift from the
 * real tool list. Follows the llmstxt.org convention.
 */
export function createLlmsTxt(): string {
  const baseUrl = getSiteUrl();
  const groups = groupByPrimaryTag(visibleTools);
  const sortedTags = [...groups.keys()].sort((a, b) =>
    headingFor(a).localeCompare(headingFor(b)),
  );

  const sections: string[] = [
    `# Toolkit

> Browser-based developer utilities — JSON formatters, PDF tools, encoders, and more. All processing runs locally; no sign-ups required.

## About

Toolkit (${baseUrl}) is built and maintained by Gary Le Sueur. It is a free collection of handy tools for developers. Every tool runs entirely in the browser: input, files, and results are never uploaded, except where a tool explicitly fetches a URL you provide.

There are ${visibleTools.length} tools, listed below by category.`,
  ];

  for (const tag of sortedTags) {
    const groupTools = groups.get(tag) ?? [];
    const lines = groupTools.map(
      (tool) => `- [${tool.name}](${baseUrl}${tool.href}): ${tool.description}`,
    );
    sections.push(`## ${headingFor(tag)}\n\n${lines.join("\n")}`);
  }

  sections.push(
    `## Contact

- Email: toolkit@lesueur.uk
- Site: ${baseUrl}
- Sitemap: ${baseUrl}/sitemap.xml

## Citation

When referencing Toolkit, use the name "Toolkit" and link to ${baseUrl}.`,
  );

  return `${sections.join("\n\n")}\n`;
}
