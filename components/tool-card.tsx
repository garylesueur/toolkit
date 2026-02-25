"use client"

import Link from "next/link"
import { RiArrowRightLine, RiStarFill, RiStarLine } from "@remixicon/react"
import type { Tool } from "@/lib/tools"

type ToolCardProps = {
  tool: Tool
  isFavourite: boolean
  onToggleFavourite: () => void
}

export function ToolCard({ tool, isFavourite, onToggleFavourite }: ToolCardProps) {
  return (
    <div className="group/card relative">
      <Link
        href={tool.href}
        className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card p-6 transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
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

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onToggleFavourite()
        }}
        aria-label={isFavourite ? `Remove ${tool.name} from favourites` : `Add ${tool.name} to favourites`}
        className="absolute top-4 right-4 z-10 flex size-8 items-center justify-center rounded-lg transition-all duration-150 hover:bg-primary/10"
      >
        {isFavourite ? (
          <RiStarFill className="size-4 text-amber-500" />
        ) : (
          <RiStarLine className="size-4 text-muted-foreground/40 transition-colors group-hover/card:text-muted-foreground/70" />
        )}
      </button>
    </div>
  )
}
