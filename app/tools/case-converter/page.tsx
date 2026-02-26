"use client"

import { useState, useCallback, useMemo } from "react"
import { Textarea } from "@/components/ui/textarea"
import { CopyableRow } from "@/components/copyable-row"

const COPY_RESET_MS = 2000

/** Split input into words by detecting boundaries: spaces, hyphens, underscores, camelCase transitions. */
function splitIntoWords(input: string): string[] {
  return input
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => w.toLowerCase())
}

function toCamelCase(words: string[]): string {
  return words
    .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join("")
}

function toPascalCase(words: string[]): string {
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("")
}

function toSnakeCase(words: string[]): string {
  return words.join("_")
}

function toKebabCase(words: string[]): string {
  return words.join("-")
}

function toScreamingSnakeCase(words: string[]): string {
  return words.map((w) => w.toUpperCase()).join("_")
}

function toTitleCase(words: string[]): string {
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
}

function toSentenceCase(words: string[]): string {
  return words
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ")
}

function toLower(words: string[]): string {
  return words.join(" ")
}

function toUpper(words: string[]): string {
  return words.map((w) => w.toUpperCase()).join(" ")
}

interface CaseDefinition {
  label: string
  convert: (words: string[]) => string
}

const CASES: CaseDefinition[] = [
  { label: "camelCase", convert: toCamelCase },
  { label: "PascalCase", convert: toPascalCase },
  { label: "snake_case", convert: toSnakeCase },
  { label: "kebab-case", convert: toKebabCase },
  { label: "SCREAMING_SNAKE_CASE", convert: toScreamingSnakeCase },
  { label: "Title Case", convert: toTitleCase },
  { label: "Sentence case", convert: toSentenceCase },
  { label: "lowercase", convert: toLower },
  { label: "UPPERCASE", convert: toUpper },
]

interface ConversionResult {
  label: string
  value: string
}

export default function CaseConverterPage() {
  const [input, setInput] = useState("")
  const [copiedValue, setCopiedValue] = useState<string | null>(null)

  const results: ConversionResult[] = useMemo(() => {
    const words = splitIntoWords(input)
    if (words.length === 0) return []
    return CASES.map((c) => ({ label: c.label, value: c.convert(words) }))
  }, [input])

  const handleCopy = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedValue(text)
    setTimeout(() => setCopiedValue(null), COPY_RESET_MS)
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Case Converter</h1>
      <p className="text-muted-foreground mt-1">
        Paste text and convert between camelCase, PascalCase, snake_case,
        kebab-case, and more.
      </p>

      <div className="mt-8 space-y-2">
        <Textarea
          placeholder="e.g. hello world, helloWorld, hello_world"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="font-mono"
          rows={3}
        />
      </div>

      {results.length > 0 && (
        <div className="mt-6 space-y-2">
          {results.map((result) => (
            <CopyableRow
              key={result.label}
              label={result.label}
              value={result.value}
              copiedValue={copiedValue}
              onCopy={handleCopy}
            />
          ))}
        </div>
      )}
    </div>
  )
}
