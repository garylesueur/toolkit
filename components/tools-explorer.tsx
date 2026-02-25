"use client"

import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useCallback, useMemo, useRef, useTransition } from "react"
import { RiSearchLine, RiCloseLine } from "@remixicon/react"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupButton, InputGroupText } from "@/components/ui/input-group"
import { ToolCard } from "@/components/tool-card"
import { useFavourites } from "@/hooks/use-favourites"
import { tools } from "@/lib/tools"
import type { Tool } from "@/lib/tools"

const SEARCH_PARAM_KEY = "q"
const DEBOUNCE_MS = 300

function matchesQuery(tool: Tool, query: string): boolean {
  const lower = query.toLowerCase()
  return (
    tool.name.toLowerCase().includes(lower) ||
    tool.description.toLowerCase().includes(lower)
  )
}

export function ToolsExplorer() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const query = searchParams.get(SEARCH_PARAM_KEY) ?? ""
  const { isFavourite, toggleFavourite } = useFavourites()

  const updateSearchParam = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)

      debounceRef.current = setTimeout(() => {
        startTransition(() => {
          const params = new URLSearchParams(searchParams.toString())
          if (value) {
            params.set(SEARCH_PARAM_KEY, value)
          } else {
            params.delete(SEARCH_PARAM_KEY)
          }
          const qs = params.toString()
          router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false })
        })
      }, DEBOUNCE_MS)
    },
    [searchParams, router, pathname, startTransition],
  )

  const clearSearch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete(SEARCH_PARAM_KEY)
      const qs = params.toString()
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false })
    })
  }, [searchParams, router, pathname, startTransition])

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

  return (
    <section className="mx-auto max-w-5xl px-6 pb-24">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
          Tools
        </h2>
        <div className="w-full max-w-xs">
          <InputGroup>
            <InputGroupAddon align="inline-start">
              <InputGroupText>
                <RiSearchLine className="size-4" />
              </InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search tools…"
              defaultValue={query}
              onChange={(e) => updateSearchParam(e.target.value)}
              aria-label="Search tools"
            />
            {query && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  variant="ghost"
                  onClick={clearSearch}
                  aria-label="Clear search"
                >
                  <RiCloseLine className="size-3.5" />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>
        </div>
      </div>

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
