"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import {
  RiFileCopyLine,
  RiCheckLine,
  RiCloseLine,
} from "@remixicon/react"
import { formatJson, getJsonStats } from "@/lib/json-formatter/format"
import type { IndentSize } from "@/lib/json-formatter/types"

const COPY_RESET_MS = 2000

type Tab = "input" | "formatted"

export default function JsonFormatterPage() {
  const [input, setInput] = useState("")
  const [activeTab, setActiveTab] = useState<Tab>("input")
  const [indentSize, setIndentSize] = useState<IndentSize>(2)
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { formatted, error } = useMemo(
    () => formatJson(input, indentSize),
    [input, indentSize],
  )

  const stats = useMemo(
    () => getJsonStats(formatted),
    [formatted],
  )

  // Auto-switch to Formatted tab when valid JSON is detected
  useEffect(() => {
    if (formatted && !error && activeTab === "input") {
      setActiveTab("formatted")
    }
  }, [formatted, error, activeTab])

  const handleCopy = useCallback(async () => {
    if (!formatted) return
    await navigator.clipboard.writeText(formatted)
    setCopied(true)
    setTimeout(() => setCopied(false), COPY_RESET_MS)
  }, [formatted])

  const handleClear = useCallback(() => {
    setInput("")
    setActiveTab("input")
    setIndentSize(2)
  }, [])

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Prevent auto-scroll on paste by maintaining scroll position
    const textarea = e.currentTarget
    const scrollTop = textarea.scrollTop
    const scrollLeft = textarea.scrollLeft
    const pageScrollY = window.scrollY
    const pageScrollX = window.scrollX

    // Let the paste happen, then restore scroll positions
    requestAnimationFrame(() => {
      textarea.scrollTop = scrollTop
      textarea.scrollLeft = scrollLeft
      window.scrollTo(pageScrollX, pageScrollY)
    })
  }, [])

  const displayValue = activeTab === "input" ? input : formatted
  const isReadOnly = activeTab === "formatted"

  return (
    <TooltipProvider>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">JSON Formatter</h1>
        <p className="text-muted-foreground mt-1">
          Paste JSON to pretty-print and validate it.
        </p>

        {/* Tab bar with actions */}
        <div className="mt-8 flex items-center gap-2">
          <div className="flex gap-0 rounded-md border p-0.5">
            <Button
              variant={activeTab === "input" ? "default" : "outline"}
              className="rounded-md border-0"
              onClick={() => setActiveTab("input")}
            >
              Input{input && !error ? " ✓" : ""}
            </Button>
            <Button
              variant={activeTab === "formatted" ? "default" : "outline"}
              className="rounded-md border-0"
              onClick={() => setActiveTab("formatted")}
              disabled={!formatted}
            >
              Formatted
            </Button>
          </div>

          <div className="flex-1" />

          {activeTab === "formatted" && (
            <div className="flex gap-0 rounded-md border p-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={indentSize === 2 ? "default" : "outline"}
                    size="sm"
                    className="rounded-md border-0 text-xs"
                    onClick={() => setIndentSize(2)}
                  >
                    2-space
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Format JSON with 2-space indentation for readability
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={indentSize === 0 ? "default" : "outline"}
                    size="sm"
                    className="rounded-md border-0 text-xs"
                    onClick={() => setIndentSize(0)}
                  >
                    Minified
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Compress JSON to a single line with no whitespace
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
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

          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={!input}
          >
            <RiCloseLine data-icon="inline-start" />
            Clear
          </Button>
        </div>

        {/* Textarea */}
        <div className="mt-4">
          <label htmlFor="json-editor" className="sr-only">
            JSON {activeTab === "input" ? "input" : "formatted output"}
          </label>
          <Textarea
            ref={textareaRef}
            id="json-editor"
            placeholder={
              activeTab === "input"
                ? 'Paste JSON here… e.g. {"key": "value"}'
                : "Formatted JSON will appear here…"
            }
            value={displayValue}
            onChange={(e) => setInput(e.target.value)}
            onPaste={handlePaste}
            readOnly={isReadOnly}
            tabIndex={isReadOnly ? -1 : 0}
            className="min-h-128 resize-y font-mono text-sm"
          />
        </div>

        {/* Error message */}
        {error && (
          <p className="mt-4 text-sm text-destructive">{error}</p>
        )}

        {/* Stats line (only on Formatted tab) */}
        {activeTab === "formatted" && formatted && !error && (
          <p className="mt-2 text-xs text-muted-foreground">
            {stats.lines} {stats.lines === 1 ? "line" : "lines"} · {stats.bytes}{" "}
            {stats.bytes === 1 ? "byte" : "bytes"}
          </p>
        )}
      </div>
    </TooltipProvider>
  )
}
