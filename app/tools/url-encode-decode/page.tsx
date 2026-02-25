"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { RiFileCopyLine, RiCheckLine } from "@remixicon/react"

type Direction = "encode" | "decode"

const INPUT_PLACEHOLDER_ENCODE = "Enter text to encode…"
const INPUT_PLACEHOLDER_DECODE = "Paste encoded URL to decode…"
const DECODE_ERROR_MESSAGE = "Malformed URI sequence"

export default function UrlEncodeDecodePage() {
  const [direction, setDirection] = useState<Direction>("encode")
  const [inputText, setInputText] = useState("")
  const [copied, setCopied] = useState(false)

  const handleSetDirection = useCallback(
    (newDirection: Direction) => {
      if (newDirection === direction) return

      if (direction === "encode") {
        setInputText(encodeURIComponent(inputText))
      } else {
        try {
          setInputText(decodeURIComponent(inputText))
        } catch {
          // Keep input as-is when decode fails
        }
      }
      setDirection(newDirection)
    },
    [direction, inputText],
  )

  let output = ""
  let decodeError: string | null = null

  if (direction === "encode") {
    output = encodeURIComponent(inputText)
  } else {
    try {
      output = decodeURIComponent(inputText)
    } catch {
      decodeError = DECODE_ERROR_MESSAGE
    }
  }

  const handleCopy = useCallback(async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [output])

  const placeholder =
    direction === "encode" ? INPUT_PLACEHOLDER_ENCODE : INPUT_PLACEHOLDER_DECODE

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        URL Encode / Decode
      </h1>
      <p className="text-muted-foreground mt-1">
        Percent-encode text for use in URLs, or decode encoded strings back to
        readable text.
      </p>

      {/* Direction toggle */}
      <div className="mt-8 inline-flex overflow-hidden rounded-md border border-border">
        <Button
          type="button"
          variant={direction === "encode" ? "default" : "outline"}
          className="rounded-r-none border-0 border-r border-border"
          onClick={() => handleSetDirection("encode")}
        >
          Encode
        </Button>
        <Button
          type="button"
          variant={direction === "decode" ? "default" : "outline"}
          className="rounded-l-none border-0"
          onClick={() => handleSetDirection("decode")}
        >
          Decode
        </Button>
      </div>

      {/* Input */}
      <div className="mt-6">
        <Textarea
          placeholder={placeholder}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="min-h-32"
        />
      </div>

      {/* Output */}
      <div className="mt-4">
        <Textarea
          value={output}
          readOnly
          className="min-h-32 resize-none"
        />
      </div>

      {decodeError && (
        <p className="mt-2 text-sm text-destructive">{decodeError}</p>
      )}

      {/* Copy button */}
      <div className="mt-4">
        <Button variant="outline" onClick={handleCopy} disabled={!output}>
          {copied ? (
            <RiCheckLine data-icon="inline-start" />
          ) : (
            <RiFileCopyLine data-icon="inline-start" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  )
}
