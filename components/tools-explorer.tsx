"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { ToolCard } from "@/components/tool-card"
import { useFavourites } from "@/hooks/use-favourites"
import { tools } from "@/lib/tools"
import type { Tool } from "@/lib/tools"

const SEARCH_PARAM_KEY = "q"
const STATIC_GRID_ID = "static-tools-grid"

function matchesQuery(tool: Tool, query: string): boolean {
  const lower = query.toLowerCase()
  return (
    tool.name.toLowerCase().includes(lower) ||
    tool.description.toLowerCase().includes(lower)
  )
}

/**
 * Client-side interactive tool grid with search filtering and favourites.
 * On mount, hides the server-rendered `ToolsGrid` (`#static-tools-grid`)
 * and renders its own interactive version in its place.
 */
export function ToolsExplorer() {
  const searchParams = useSearchParams()
  const query = searchParams.get(SEARCH_PARAM_KEY) ?? ""
  const { isFavourite, toggleFavourite } = useFavourites()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const staticGrid = document.getElementById(STATIC_GRID_ID)
    if (staticGrid) {
      staticGrid.hidden = true
    }
    setMounted(true)
  }, [])

  const sortedTools = useMemo(() => {
    const filtered = query
      ? tools.filter((tool) => matchesQuery(tool, query))
      : tools

    const favourites: Tool[] = []
    const rest: Tool[] = []

    for (const tool of filtered) {
      if (isFavourite(tool.href)) {
        favourites.push(tool)
      } else {
        rest.push(tool)
      }
    }

    return [...favourites, ...rest]
  }, [query, isFavourite])

  if (!mounted) {
    return null
  }

  return (
    <section className="mx-auto max-w-5xl px-6 pt-8 pb-24">
      {sortedTools.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          No tools match &ldquo;{query}&rdquo;
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedTools.map((tool) => (
            <ToolCard
              key={tool.href}
              tool={tool}
              isFavourite={isFavourite(tool.href)}
              onToggleFavourite={() => toggleFavourite(tool.href)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
