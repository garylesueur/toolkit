import { Suspense } from "react"
import { RiToolsFill } from "@remixicon/react"
import { ToolsExplorer } from "@/components/tools-explorer"
import { ToolsGrid } from "@/components/tools-grid"
import { ToolsSearch } from "@/components/tools-search"

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
              <h1 className="text-sm font-semibold tracking-tight">
                Toolkit
              </h1>
              <p className="text-muted-foreground text-xs">
                Developer utilities by Gary Le Sueur
              </p>
            </div>
          </div>
          <Suspense>
            <ToolsSearch />
          </Suspense>
        </div>
      </header>

      <main className="flex-1">
        <ToolsGrid />
        <Suspense>
          <ToolsExplorer />
        </Suspense>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <p className="text-muted-foreground text-xs">
            Built by Gary Le Sueur
          </p>
          <div className="text-muted-foreground flex items-center gap-4 text-xs">
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
  )
}
