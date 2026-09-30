import { RiCupLine, RiToolsFill } from "@remixicon/react";
import { Suspense } from "react";

import { HomeFaq } from "@/components/home-faq";
import { ThemeToggle } from "@/components/theme-toggle";
import { ToolsExplorer } from "@/components/tools-explorer";
import { ToolsGrid } from "@/components/tools-grid";
import { ToolsSearch } from "@/components/tools-search";

export default function Page() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <RiToolsFill className="size-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">Toolkit</h1>
              <p className="text-muted-foreground text-xs">
                Developer utilities by Gary Le Sueur
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Suspense>
              <ToolsSearch />
            </Suspense>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <ToolsGrid />
        <Suspense>
          <ToolsExplorer />
        </Suspense>
      </main>

      <HomeFaq />

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <a
            href="https://gaz.dev"
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground w-fit text-xs transition-colors"
          >
            Built by Gary Le Sueur · gaz.dev
          </a>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-3 text-xs">
            <a
              href="https://buymeacoffee.com/lesueur"
              target="_blank"
              rel="noreferrer"
              className="text-foreground hover:bg-accent inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 font-medium transition-colors"
            >
              <RiCupLine className="size-3.5 text-amber-600 dark:text-amber-400" />
              Buy me a coffee
            </a>
            <a
              href="mailto:toolkit@lesueur.uk"
              className="hover:text-foreground transition-colors"
            >
              toolkit@lesueur.uk
            </a>
            <span>{new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
