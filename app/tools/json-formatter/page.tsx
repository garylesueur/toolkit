"use client"

import { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { RiFileCopyLine, RiCheckLine } from "@remixicon/react"

const COPY_RESET_MS = 2000

type FormatResult =
  | { formatted: string; error: null }
  | { formatted: ""; error: string }

function formatJson(input: string): FormatResult {
  const trimmed = input.trim()
  if (!trimmed) {
    return { formatted: "", error: null }
  }

  try {
    const parsed = JSON.parse(trimmed)
    return { formatted: JSON.stringify(parsed, null, 2), error: null }
  } catch (err) {
    const message =
      err instanceof SyntaxError ? err.message : "Invalid JSON"
    return { formatted: "", error: message }
  }
}

export default function JsonFormatterPage() {
  const [input, setInput] = useState("")
  const [copied, setCopied] = useState(false)

  const { formatted, error } = useMemo(() => formatJson(input), [input])

  const handleCopy = useCallback(async () => {
    if (!formatted) return
    await navigator.clipboard.writeText(formatted)
    setCopied(true)
    setTimeout(() => setCopied(false), COPY_RESET_MS)
  }, [formatted])

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">JSON Formatter</h1>
      <p className="text-muted-foreground mt-1">
        Paste JSON to pretty-print and validate it.
      </p>

      <div className="mt-8 space-y-4">
        <div>
          <label htmlFor="json-input" className="sr-only">
            JSON input
          </label>
          <Textarea
            id="json-input"
            placeholder='Paste JSON here… e.g. {"key": "value"}'
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="min-h-40 resize-y font-mono text-sm"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {formatted && (
          <div>
            <Textarea
              value={formatted}
              readOnly
              tabIndex={-1}
              className="min-h-40 resize-y bg-muted/50 font-mono text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={handleCopy}
              disabled={!formatted}
            >
              {copied ? (
                <RiCheckLine data-icon="inline-start" />
              ) : (
                <RiFileCopyLine data-icon="inline-start" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
