"use client";

import { RiArrowRightLine } from "@remixicon/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { getRelatedTools } from "@/lib/tools";

export function RelatedTools() {
  const pathname = usePathname();
  const related = getRelatedTools(pathname);

  if (related.length === 0) return null;

  return (
    <section className="mt-16 border-t border-border/60 pt-10">
      <h2 className="mb-4 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        Related Tools
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {related.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group flex items-start gap-3 rounded-lg border border-border/60 bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
              <tool.icon className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{tool.name}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                {tool.description}
              </p>
            </div>
            <RiArrowRightLine className="mt-1 size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>
        ))}
      </div>
    </section>
  );
}
