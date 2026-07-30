import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { generateMarkdownPdf } from "@/lib/markdown-pdf/generate-server";
import type { MarkdownPdfOptions } from "@/lib/markdown-pdf/types";
import {
  DEFAULT_OPTIONS,
  THEME_IDS,
  THEME_SUMMARIES,
} from "@/lib/markdown-pdf/types";

import { BLOB_TTL_HOURS, isBlobConfigured, storePdf } from "./storage";

const SERVER_NAME = "lesueur-toolkit";
const SERVER_VERSION = "1.0.0";

/** Guards against a single call trying to typeset an unreasonable document. */
const MAX_MARKDOWN_BYTES = 512_000;

const themeList = THEME_SUMMARIES.map(
  (theme) => `"${theme.id}" (${theme.description})`,
).join(", ");

const inputSchema = {
  markdown: z
    .string()
    .min(1)
    .describe(
      "GitHub-flavoured Markdown to typeset. Tables, task lists, code blocks, and strikethrough are all supported.",
    ),
  title: z
    .string()
    .optional()
    .describe(
      "Document title. Shown in the PDF footer, stored in the PDF metadata, and used for the filename.",
    ),
  theme: z
    .enum(THEME_IDS)
    .optional()
    .describe(`Visual theme. One of: ${themeList}. Defaults to "clean".`),
  pageSize: z
    .enum(["A4", "LETTER"])
    .optional()
    .describe('Page size. Defaults to "A4".'),
  includePageNumbers: z
    .boolean()
    .optional()
    .describe(
      "Render a footer with the title and page numbers. Defaults to true.",
    ),
};

type ToolInput = {
  markdown: string;
  title?: string;
  theme?: (typeof THEME_IDS)[number];
  pageSize?: "A4" | "LETTER";
  includePageNumbers?: boolean;
};

function toOptions(input: ToolInput): MarkdownPdfOptions {
  return {
    theme: input.theme ?? DEFAULT_OPTIONS.theme,
    pageSize: input.pageSize ?? DEFAULT_OPTIONS.pageSize,
    title: input.title ?? DEFAULT_OPTIONS.title,
    includePageNumbers:
      input.includePageNumbers ?? DEFAULT_OPTIONS.includePageNumbers,
  };
}

function formatBytes(bytes: number): string {
  const kb = bytes / 1024;
  return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(2)} MB`;
}

export function createMcpServer(): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions:
        "Converts Markdown to a typeset PDF and returns a download URL. " +
        "Pass the full Markdown document as the `markdown` argument.",
    },
  );

  server.registerTool(
    "markdown_to_pdf",
    {
      title: "Markdown to PDF",
      description:
        "Typeset a GitHub-flavoured Markdown document as a PDF and return a download URL. " +
        "Headings, nested lists, task lists, tables, code blocks, blockquotes, and inline formatting are all rendered. " +
        "Remote images are not fetched — embed images as data: URIs if they must appear.",
      inputSchema,
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async (input) => {
      const args = input as ToolInput;

      const byteLength = Buffer.byteLength(args.markdown, "utf8");
      if (byteLength > MAX_MARKDOWN_BYTES) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `The Markdown is ${formatBytes(byteLength)}, over the ${formatBytes(MAX_MARKDOWN_BYTES)} limit for a single document.`,
            },
          ],
        };
      }

      if (!isBlobConfigured()) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: "BLOB_READ_WRITE_TOKEN is not configured on this deployment, so generated PDFs cannot be stored.",
            },
          ],
        };
      }

      const options = toOptions(args);

      try {
        const { bytes, warnings } = await generateMarkdownPdf(
          args.markdown,
          options,
        );
        const stored = await storePdf(bytes, options.title || "document");

        const lines = [
          `PDF ready: ${stored.url}`,
          `${formatBytes(stored.size)} · theme "${options.theme}" · ${options.pageSize}`,
          `The link expires after about ${BLOB_TTL_HOURS} hours.`,
        ];
        if (warnings.length > 0) {
          lines.push("", "Caveats:", ...warnings.map((w) => `- ${w}`));
        }

        return {
          content: [{ type: "text" as const, text: lines.join("\n") }],
        };
      } catch (err: unknown) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text:
                err instanceof Error
                  ? `PDF generation failed: ${err.message}`
                  : "PDF generation failed.",
            },
          ],
        };
      }
    },
  );

  return server;
}
