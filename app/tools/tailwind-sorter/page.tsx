"use client"

import { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { RiFileCopyLine, RiCheckLine } from "@remixicon/react"
import { sortTailwindClasses } from "@/lib/tailwind-sorter/sort"

const COPY_RESET_MS = 2000

const EXAMPLE_INPUT =
  "text-white p-4 flex hover:bg-blue-600 items-center bg-blue-500 rounded-lg shadow-md font-bold text-lg mb-4 justify-between w-full"

export default function TailwindSorterPage() {
  const [input, setInput] = useState(EXAMPLE_INPUT)
  const [copied, setCopied] = useState(false)

  const sorted = useMemo(() => sortTailwindClasses(input), [input])

  const handleCopy = useCallback(async () => {
    if (!sorted) return
    await navigator.clipboard.writeText(sorted)
    setCopied(true)
    setTimeout(() => setCopied(false), COPY_RESET_MS)
  }, [sorted])

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        Tailwind Class Sorter
      </h1>
      <p className="text-muted-foreground mt-1">
        Paste a className string and get it back sorted in the recommended
        Tailwind order.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div>
          <label htmlFor="tw-input" className="mb-2 block text-sm font-medium">
            Input
          </label>
          <Textarea
            id="tw-input"
            placeholder="Paste Tailwind classes here…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="min-h-40 resize-y font-mono text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="tw-output"
            className="mb-2 block text-sm font-medium"
          >
            Sorted output
          </label>
          <Textarea
            id="tw-output"
            value={sorted}
            readOnly
            tabIndex={-1}
            className="min-h-40 resize-y bg-muted/50 font-mono text-sm"
          />
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={handleCopy}
            disabled={!sorted}
          >
            {copied ? (
              <RiCheckLine data-icon="inline-start" />
            ) : (
              <RiFileCopyLine data-icon="inline-start" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
    </div>
  )
}
