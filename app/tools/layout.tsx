import { RiArrowLeftLine } from "@remixicon/react";
import { headers } from "next/headers";
import Link from "next/link";

import { RelatedTools } from "@/components/related-tools";
import { ThemeToggle } from "@/components/theme-toggle";
import { ToolBreadcrumbJsonLd } from "@/components/tool-breadcrumb-json-ld";

function extractToolSlug(pathname: string): string | null {
  const match = pathname.match(/^\/tools\/([^/]+)/);
  return match?.[1] ?? null;
}

export default async function ToolsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const slug = extractToolSlug(pathname);

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      {slug ? <ToolBreadcrumbJsonLd slug={slug} /> : null}
      <nav className="mb-8 flex items-center justify-between">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <RiArrowLeftLine className="size-4" />
          Back to toolkit
        </Link>
        <ThemeToggle />
      </nav>
      {children}
      <RelatedTools />
    </div>
  );
}
