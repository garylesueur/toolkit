"use client"

import { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { RiFileCopyLine, RiCheckLine } from "@remixicon/react"

type Direction = "encode" | "decode"

const COPY_RESET_MS = 2000

function base64Encode(input: string): string {
  return btoa(unescape(encodeURIComponent(input)))
}

function base64Decode(input: string): { output: string; error: string | null } {
  const trimmed = input.trim()
  if (!trimmed) {
    return { output: "", error: null }
  }
  try {
    const decoded = decodeURIComponent(escape(atob(trimmed)))
    return { output: decoded, error: null }
  } catch {
    return { output: "", error: "Invalid Base64" }
  }
}

export default function Base64Page() {
  const [direction, setDirection] = useState<Direction>("encode")
  const [input, setInput] = useState("")
  const [copied, setCopied] = useState(false)

  const { output, error } = useMemo(() => {
    if (direction === "encode") {
      return { output: base64Encode(input), error: null }
    }
    return base64Decode(input)
  }, [direction, input])

  const handleDirectionChange = useCallback(
    (newDirection: Direction) => {
      if (newDirection === direction) return
      setInput(output)
      setDirection(newDirection)
    },
    [direction, output],
  )

  const handleCopy = useCallback(async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), COPY_RESET_MS)
  }, [output])

  const inputPlaceholder =
    direction === "encode"
      ? "Enter text to encode…"
      : "Paste Base64 to decode…"

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        Base64 Encode / Decode
      </h1>
      <p className="text-muted-foreground mt-1">
        Encode text to Base64 or decode Base64 back to text.
      </p>

      {/* Direction toggle */}
      <div className="mt-8 flex gap-0 rounded-md border p-0.5">
        <Button
          variant={direction === "encode" ? "default" : "outline"}
          className="flex-1 rounded-md border-0"
          onClick={() => handleDirectionChange("encode")}
        >
          Encode
        </Button>
        <Button
          variant={direction === "decode" ? "default" : "outline"}
          className="flex-1 rounded-md border-0"
          onClick={() => handleDirectionChange("decode")}
        >
          Decode
        </Button>
      </div>

      {/* Textareas */}
      <div className="mt-6 space-y-4">
        <div>
          <Textarea
            placeholder={inputPlaceholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="min-h-32 resize-y"
          />
        </div>
        <div>
          <Textarea
            placeholder={direction === "encode" ? "Base64 output…" : "Decoded text…"}
            value={output}
            readOnly
            className="min-h-32 resize-y bg-muted/50"
          />
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={handleCopy}
            disabled={!output}
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

      {error && (
        <p className="mt-4 text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
