"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { RiFileCopyLine, RiCheckLine } from "@remixicon/react"

type Direction = "encode" | "decode"

const COPY_FEEDBACK_MS = 2000

/** Encodes special characters to HTML entities. Replaces & first to avoid double-encoding. */
function encodeHtmlEntities(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

/** Decodes HTML entities using a textarea element (safe for client-side React). */
function decodeHtmlEntities(text: string): string {
  if (typeof document === "undefined") return text
  const textarea = document.createElement("textarea")
  textarea.innerHTML = text
  return textarea.value
}

export default function HtmlEntitiesPage() {
  const [direction, setDirection] = useState<Direction>("encode")
  const [inputText, setInputText] = useState("")
  const [copied, setCopied] = useState(false)

  const output =
    direction === "encode"
      ? encodeHtmlEntities(inputText)
      : decodeHtmlEntities(inputText)

  const handleDirectionChange = useCallback((newDirection: Direction) => {
    if (newDirection === direction) return

    const currentOutput =
      newDirection === "decode"
        ? encodeHtmlEntities(inputText)
        : decodeHtmlEntities(inputText)
    setInputText(currentOutput)
    setDirection(newDirection)
  }, [direction, inputText])

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), COPY_FEEDBACK_MS)
  }, [output])

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        HTML Entity Encode / Decode
      </h1>
      <p className="text-muted-foreground mt-1">
        Convert special characters to HTML entities and back.
      </p>

      {/* Direction toggle */}
      <div className="mt-8 flex rounded-md border border-input p-0.5 shadow-xs [&>button]:flex-1">
        <Button
          variant={direction === "encode" ? "default" : "outline"}
          size="default"
          className="rounded-[5px]"
          onClick={() => handleDirectionChange("encode")}
        >
          Encode
        </Button>
        <Button
          variant={direction === "decode" ? "default" : "outline"}
          size="default"
          className="rounded-[5px]"
          onClick={() => handleDirectionChange("decode")}
        >
          Decode
        </Button>
      </div>

      {/* Textareas */}
      <div className="mt-6 space-y-4">
        <div>
          <label htmlFor="html-input" className="sr-only">
            {direction === "encode"
              ? "Text to encode"
              : "HTML entities to decode"}
          </label>
          <Textarea
            id="html-input"
            placeholder={
              direction === "encode"
                ? "Enter text to encode (e.g. <script>alert('XSS')</script>)"
                : "Enter HTML entities to decode (e.g. &lt;script&gt;alert(&#39;XSS&#39;)&lt;/script&gt;)"
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="min-h-24 font-mono text-sm"
          />
        </div>

        <div>
          <label htmlFor="html-output" className="sr-only">
            Result
          </label>
          <Textarea
            id="html-output"
            readOnly
            placeholder="Result will appear here…"
            value={output}
            className="min-h-24 font-mono text-sm"
            tabIndex={-1}
          />
        </div>
      </div>

      {/* Copy button */}
      <div className="mt-4">
        <Button variant="outline" onClick={() => void handleCopy()}>
          {copied ? (
            <RiCheckLine
              className="size-4 text-green-600 dark:text-green-500"
              data-icon="inline-start"
            />
          ) : (
            <RiFileCopyLine data-icon="inline-start" />
          )}
          {copied ? "Copied" : "Copy result"}
        </Button>
      </div>
    </div>
  )
}
