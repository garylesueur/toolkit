"use client"

import { RiStarFill, RiStarLine } from "@remixicon/react"
import { ToolCardStatic } from "@/components/tool-card-static"
import type { Tool } from "@/lib/tools"

type ToolCardProps = {
  tool: Tool
  isFavourite: boolean
  onToggleFavourite: () => void
}

export function ToolCard({ tool, isFavourite, onToggleFavourite }: ToolCardProps) {
  return (
    <div className="relative h-full">
      <ToolCardStatic tool={tool} />

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
