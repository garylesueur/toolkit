"use client"

import { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RiFileCopyLine, RiCheckLine } from "@remixicon/react"

const COPY_RESET_MS = 2000
const DEFAULT_MAX_LENGTH = 0

type Separator = "-" | "_" | ""

const NONE_SENTINEL = "none"

function separatorFromSelect(value: string): Separator {
  if (value === NONE_SENTINEL) return ""
  return value as Separator
}

function separatorToSelect(sep: Separator): string {
  return sep === "" ? NONE_SENTINEL : sep
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function generateSlug(
  input: string,
  separator: Separator,
  maxLength: number,
  transliterate: boolean,
): string {
  let slug = input.trim().toLowerCase()

  if (transliterate) {
    slug = slug.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  }

  slug = slug.replace(/[^a-z0-9]+/g, separator)

  if (separator !== "") {
    slug = slug.replace(
      new RegExp(
        `^${escapeRegex(separator)}+|${escapeRegex(separator)}+$`,
        "g",
      ),
      "",
    )
  }

  if (maxLength > 0 && slug.length > maxLength) {
    slug = slug.slice(0, maxLength)
    if (separator !== "") {
      slug = slug.replace(new RegExp(`${escapeRegex(separator)}+$`), "")
    }
  }

  return slug
}

export default function SlugGeneratorPage() {
  const [input, setInput] = useState("")
  const [separator, setSeparator] = useState<Separator>("-")
  const [maxLengthInput, setMaxLengthInput] = useState("")
  const [transliterate, setTransliterate] = useState(true)
  const [copied, setCopied] = useState(false)

  const maxLength = useMemo(() => {
    if (maxLengthInput.trim() === "") return DEFAULT_MAX_LENGTH
    const n = parseInt(maxLengthInput, 10)
    return Number.isFinite(n) && n >= 0 ? n : DEFAULT_MAX_LENGTH
  }, [maxLengthInput])

  const slug = useMemo(
    () => generateSlug(input, separator, maxLength, transliterate),
    [input, separator, maxLength, transliterate],
  )

  const handleCopy = useCallback(async () => {
    if (!slug) return
    await navigator.clipboard.writeText(slug)
    setCopied(true)
    setTimeout(() => setCopied(false), COPY_RESET_MS)
  }, [slug])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Slug Generator</h1>
        <p className="text-muted-foreground mt-1">
          Paste a title or sentence to generate a URL-friendly slug.
        </p>
      </div>

      <section className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="slug-input">Title or sentence</Label>
          <Textarea
            id="slug-input"
            placeholder="e.g. My Awesome Blog Post!"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="w-40 space-y-2">
            <Label htmlFor="separator-select">Separator</Label>
            <Select
              value={separatorToSelect(separator)}
              onValueChange={(v) => setSeparator(separatorFromSelect(v))}
            >
              <SelectTrigger id="separator-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-">Hyphen (-)</SelectItem>
                <SelectItem value="_">Underscore (_)</SelectItem>
                <SelectItem value={NONE_SENTINEL}>Nothing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-40 space-y-2">
            <Label htmlFor="max-length-input">Max length</Label>
            <Input
              id="max-length-input"
              type="text"
              inputMode="numeric"
              placeholder="0 = no limit"
              value={maxLengthInput}
              onChange={(e) => setMaxLengthInput(e.target.value)}
              className="font-mono"
            />
          </div>

          <div className="flex items-end pb-2">
            <label
              htmlFor="transliterate-checkbox"
              className="flex items-center gap-2 text-sm"
            >
              <input
                id="transliterate-checkbox"
                type="checkbox"
                checked={transliterate}
                onChange={(e) => setTransliterate(e.target.checked)}
                className="size-4 rounded border-border accent-primary"
              />
              Transliterate accented characters
            </label>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Generated Slug</h2>
        <div className="flex items-center justify-between gap-4 rounded-md border bg-muted/30 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-sm break-all">
              {slug || (
                <span className="text-muted-foreground">
                  Type something above…
                </span>
              )}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleCopy}
            disabled={!slug}
          >
            {copied ? <RiCheckLine /> : <RiFileCopyLine />}
          </Button>
        </div>
      </section>
    </div>
  )
}
