"use client"

import { useState, useMemo } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { analyseText, countHidden } from "@/lib/hidden-characters/detect"
import type { TextSegment } from "@/lib/hidden-characters/detect"

interface AnnotatedTextProps {
  segments: TextSegment[]
}

function AnnotatedText({ segments }: AnnotatedTextProps) {
  return (
    <div className="whitespace-pre-wrap rounded-md border bg-muted/50 p-4 font-mono text-sm">
      {segments.map((segment, idx) => {
        if (segment.hidden) {
          const hex = `U+${segment.hidden.codePoint.toString(16).toUpperCase().padStart(4, "0")}`
          return (
            <span
              key={idx}
              title={`${segment.hidden.label} (${hex})`}
              className="mx-0.5 inline-flex items-center rounded bg-destructive/15 px-1.5 py-0.5 align-baseline font-mono text-xs font-medium text-destructive"
            >
              {segment.hidden.label}
            </span>
          )
        }
        return <span key={idx}>{segment.text}</span>
      })}
    </div>
  )
}

export default function HiddenCharactersPage() {
  const [input, setInput] = useState("")

  const segments = useMemo(() => analyseText(input), [input])
  const hiddenCount = useMemo(() => countHidden(segments), [segments])

  const hasInput = input.length > 0

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        Hidden Character Revealer
      </h1>
      <p className="text-muted-foreground mt-1">
        Paste text to spot invisible and non-printing characters.
      </p>

      <div className="mt-8">
        <label htmlFor="hidden-char-input" className="sr-only">
          Text to analyse
        </label>
        <Textarea
          id="hidden-char-input"
          placeholder="Paste text here to reveal hidden characters…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="min-h-32 resize-y"
        />
      </div>

      {hasInput && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant={hiddenCount > 0 ? "destructive" : "secondary"}>
              {hiddenCount} hidden {hiddenCount === 1 ? "character" : "characters"} found
            </Badge>
          </div>

          <AnnotatedText segments={segments} />
        </div>
      )}
    </div>
  )
}
