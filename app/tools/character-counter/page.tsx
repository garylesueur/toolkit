"use client"

import { useState, useMemo } from "react"
import { Textarea } from "@/components/ui/textarea"

interface CharacterStats {
  characters: number
  charactersNoSpaces: number
  words: number
  sentences: number
  lines: number
  paragraphs: number
  bytes: number
}

interface StatCardProps {
  value: number
  label: string
}

function computeCharacterStats(text: string): CharacterStats {
  const trimmed = text.trim()
  const isEmpty = trimmed.length === 0

  const words = isEmpty
    ? 0
    : trimmed
        .split(/\s+/)
        .filter((w) => w.length > 0).length

  const sentences = isEmpty
    ? 0
    : (text.match(/[.!?]/g) ?? []).length

  const lineParts = text.split("\n")
  const lines = isEmpty ? 0 : Math.max(1, lineParts.length)

  const paragraphParts = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0)
  const paragraphs = isEmpty ? 0 : paragraphParts.length

  return {
    characters: text.length,
    charactersNoSpaces: text.replace(/\s/g, "").length,
    words,
    sentences,
    lines,
    paragraphs,
    bytes: new TextEncoder().encode(text).length,
  }
}

function StatCard({ value, label }: StatCardProps) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card px-4 py-3">
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  )
}

const STAT_CARDS: { key: keyof CharacterStats; label: string }[] = [
  { key: "characters", label: "Characters" },
  { key: "charactersNoSpaces", label: "Characters (no spaces)" },
  { key: "words", label: "Words" },
  { key: "sentences", label: "Sentences" },
  { key: "lines", label: "Lines" },
  { key: "paragraphs", label: "Paragraphs" },
  { key: "bytes", label: "Bytes (UTF-8)" },
]

export default function CharacterCounterPage() {
  const [text, setText] = useState("")

  const stats = useMemo(() => computeCharacterStats(text), [text])

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        Character & Word Counter
      </h1>
      <p className="text-muted-foreground mt-1">
        Paste or type text to see live statistics.
      </p>

      <div className="mt-8">
        <label htmlFor="character-counter-input" className="sr-only">
          Text to analyse
        </label>
        <Textarea
          id="character-counter-input"
          placeholder="Start typing or paste your text here…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-48"
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {STAT_CARDS.map(({ key, label }) => (
          <StatCard key={key} value={stats[key]} label={label} />
        ))}
      </div>
    </div>
  )
}
