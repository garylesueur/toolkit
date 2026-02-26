import Link from "next/link"
import { RiArrowRightLine } from "@remixicon/react"
import type { Tool } from "@/lib/tools"

type ToolCardStaticProps = {
  tool: Tool
}

export function ToolCardStatic({ tool }: ToolCardStaticProps) {
  return (
    <div className="group/card relative h-full">
      <Link
        href={tool.href}
        className="flex h-full flex-col gap-4 rounded-xl border border-border/60 bg-card p-6 transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
      >
        <div className="flex items-start justify-between">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover/card:bg-primary/15">
            <tool.icon className="size-5" />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <h3 className="text-sm font-semibold">{tool.name}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {tool.description}
          </p>
        </div>
        <div className="text-muted-foreground flex items-center gap-1 text-xs font-medium transition-colors group-hover/card:text-primary">
          Open tool
          <RiArrowRightLine className="size-3 transition-transform group-hover/card:translate-x-0.5" />
        </div>
      </Link>
    </div>
  )
}
