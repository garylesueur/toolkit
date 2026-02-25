import { Suspense } from "react"
import { RiToolsFill } from "@remixicon/react"
import { Badge } from "@/components/ui/badge"
import { ToolsExplorer } from "@/components/tools-explorer"

export default function Page() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <RiToolsFill className="size-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight">
            Toolkit
          </span>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-6 pt-20 pb-16">
          <Badge variant="secondary" className="mb-4">
            Developer Tools
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            A developer&apos;s toolkit
            <span className="text-muted-foreground font-normal">
              ,{" "}by Gary Le Sueur
            </span>
          </h1>
          <p className="text-muted-foreground mt-4 max-w-lg text-lg leading-relaxed">
            A growing collection of handy utilities for everyday dev work.
            No sign-ups, no nonsense — just tools that do the job.
          </p>
        </section>

        <Suspense>
          <ToolsExplorer />
        </Suspense>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <p className="text-muted-foreground text-xs">
            Built by Gary Le Sueur
          </p>
          <p className="text-muted-foreground text-xs">
            {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  )
}
