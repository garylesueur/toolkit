"use client"

import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useCallback, useRef, useTransition } from "react"
import { RiSearchLine, RiCloseLine } from "@remixicon/react"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
  InputGroupText,
} from "@/components/ui/input-group"

const SEARCH_PARAM_KEY = "q"
const DEBOUNCE_MS = 300

export function ToolsSearch() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const query = searchParams.get(SEARCH_PARAM_KEY) ?? ""

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

  return (
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
  )
}
