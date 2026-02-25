import Link from "next/link"
import { tools } from "@/lib/tools"
import { RiArrowRightLine, RiToolsFill } from "@remixicon/react"
import { Badge } from "@/components/ui/badge"

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

        <section className="mx-auto max-w-5xl px-6 pb-24">
          <h2 className="text-muted-foreground mb-6 text-xs font-semibold uppercase tracking-widest">
            Tools
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="group relative flex flex-col gap-4 rounded-xl border border-border/60 bg-card p-6 transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
              >
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                  <tool.icon className="size-5" />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <h3 className="text-sm font-semibold">{tool.name}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {tool.description}
                  </p>
                </div>
                <div className="text-muted-foreground flex items-center gap-1 text-xs font-medium transition-colors group-hover:text-primary">
                  Open tool
                  <RiArrowRightLine className="size-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </section>
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
