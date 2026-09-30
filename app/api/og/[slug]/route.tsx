import { ImageResponse } from "next/og";

import { tools } from "@/lib/tools";

/**
 * Per-tool Open Graph images. Prerendered at build time so social crawlers
 * fetch them as plain static assets — some (notably Twitter) are unreliable
 * with on-demand OG URLs.
 */
export const dynamic = "force-static";
export const dynamicParams = false;

const SIZE = { width: 1200, height: 630 };

const BACKGROUND = "#09090b";
const FOREGROUND = "#fafafa";
const MUTED = "#a1a1aa";
const ACCENT = "#38bdf8";

const FONT_FAMILY =
  "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif";

/** Long names wrap badly at the largest size, so step down past a threshold. */
const LONG_NAME_LENGTH = 24;
const TITLE_SIZE = 76;
const LONG_TITLE_SIZE = 60;

/**
 * Covers `tools` rather than `visibleTools`: dev-only tools are hidden from
 * the grid and sitemap but their pages still resolve, so they need an image.
 */
export function generateStaticParams(): { slug: string }[] {
  return tools.map((tool) => ({
    slug: tool.href.replace("/tools/", ""),
  }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const tool = tools.find((t) => t.href === `/tools/${slug}`);

  if (!tool) {
    return new Response("Not found", { status: 404 });
  }

  return new ImageResponse(
    <div
      style={{
        background: BACKGROUND,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        fontFamily: FONT_FAMILY,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontSize: 28,
            fontWeight: 600,
            color: ACCENT,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Toolkit
        </div>
        <div
          style={{
            fontSize:
              tool.name.length > LONG_NAME_LENGTH
                ? LONG_TITLE_SIZE
                : TITLE_SIZE,
            fontWeight: 700,
            color: FOREGROUND,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            marginTop: 28,
            maxWidth: 1000,
          }}
        >
          {tool.name}
        </div>
        <div
          style={{
            fontSize: 30,
            color: MUTED,
            marginTop: 24,
            maxWidth: 940,
            lineHeight: 1.35,
          }}
        >
          {tool.description}
        </div>
      </div>

      <div style={{ fontSize: 26, color: MUTED, display: "flex" }}>
        toolkit.lesueur.uk
      </div>
    </div>,
    { ...SIZE },
  );
}
