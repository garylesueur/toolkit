"use client"

import { useState, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { RiFileCopyLine, RiCheckLine } from "@remixicon/react"

/**
 * Classic Lorem ipsum sentences used as source material.
 * First sentence must always be "Lorem ipsum dolor sit amet, consectetur adipiscing elit."
 */
const LOREM_SENTENCES = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
  "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.",
  "Eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident.",
  "Sunt in culpa qui officia deserunt mollit anim id est laborum.",
  "Curabitur pretium tincidunt lacus nullam laoreet vel vitae arcu.",
  "Vestibulum sed magna at nunc commodo placerat praesent blandit nam nulla.",
  "Integer pede justo, lacinia eget, tincidunt eget, tempus vel, pede.",
  "Morbi porttitor lorem id ligula suspendisse ornare consequat lectus.",
  "In est risus, auctor sed, tristique in, tempus sit amet, sem.",
  "Fusce consequat nulla nisl nunc nisl duis bibendum felis sed interdum.",
  "Venenatis turpis enim blandit mi in porttitor pede justo eu massa.",
  "Donec dapibus duis at velit eu est congue elementum in hac habitasse.",
  "Platea dictumst morbi vestibulum velit id pretium iaculis diam erat fermentum.",
  "Justo nec condimentum neque sapien placerat ante nulla justo aliquam quis.",
  "Turpis eget elit sodales scelerisque mauris sit amet eros suspendisse accumsan.",
  "Tortor quis turpis sed ante vivamus tortor duis mattis egestas metus.",
  "Aenean fermentum donec ut mauris eget massa tempor convallis nulla neque.",
  "Libero convallis eget eleifend luctus ultricies eu nibh quisque id justo.",
  "Sit amet sapien dignissim vestibulum vestibulum ante ipsum primis in faucibus.",
  "Orci luctus et ultrices posuere cubilia curae nulla dapibus dolor vel est.",
  "Donec odio justo, sollicitudin ut, suscipit a, feugiat et, eros.",
  "Vestibulum ac est lacinia nisi venenatis tristique fusce congue diam id.",
  "Ornare imperdiet sapien urna pretium nisl ut volutpat sapien arcu sed augue.",
  "Aliquam erat volutpat in congue etiam justo etiam pretium iaculis justo.",
  "In hac habitasse platea dictumst etiam faucibus cursus urna ut tellus.",
  "Nulla ut erat id mauris vulputate elementum nullam varius nulla facilisi.",
  "Cras non velit nec nisi vulputate nonummy maecenas tincidunt lacus at velit.",
  "Vivamus vel nulla eget eros elementum pellentesque quisque porta volutpat erat.",
  "Quisque erat eros viverra eget congue eget semper rutrum nulla nunc.",
  "Purus phasellus in felis donec semper sapien a libero nam dui.",
  "Proin leo odio porttitor id consequat in consequat ut nulla sed.",
  "Accumsan tellus nisi eu orci mauris lacinia sapien quis libero nullam.",
  "Sit amet turpis elementum ligula vehicula consequat morbi a ipsum integer.",
  "A nibh in quis justo maecenas rhoncus aliquam lacus morbi quis tortor.",
]

type LoremUnit = "paragraphs" | "sentences" | "words"

const START_WORDS = ["Lorem", "ipsum", "dolor", "sit", "amet"]

/**
 * Extracts all words from sentences (lowercase, no punctuation).
 */
function getAllWords(sentences: readonly string[]): string[] {
  const words: string[] = []
  for (const sentence of sentences) {
    const cleaned = sentence
      .replace(/[.,;:!?]/g, "")
      .toLowerCase()
      .split(/\s+/)
    for (const w of cleaned) {
      if (w.length > 0) words.push(w)
    }
  }
  return words
}

/**
 * Picks a random element from an array.
 */
function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

/**
 * Shuffles array in place (Fisher–Yates) and returns it.
 */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
  return arr
}

/**
 * Generates Lorem ipsum text based on count and unit.
 */
function generateLorem(
  count: number,
  unit: LoremUnit,
  sentences: readonly string[],
  wordPool: string[],
): string {
  if (unit === "words") {
    const result: string[] =
      count <= START_WORDS.length
        ? START_WORDS.slice(0, count)
        : [
            ...START_WORDS,
            ...Array.from({ length: count - START_WORDS.length }, () =>
              pickRandom(wordPool),
            ),
          ]
    const joined = result.join(" ")
    const capitalised =
      joined.charAt(0).toUpperCase() + joined.slice(1).toLowerCase()
    return capitalised + "."
  }

  if (unit === "sentences") {
    const result: string[] = [sentences[0]!]
    for (let i = 0; i < count - 1; i++) {
      result.push(pickRandom(sentences))
    }
    return result.join(" ")
  }

  // paragraphs: 4–6 sentences each, first paragraph starts with Lorem ipsum
  const result: string[] = []
  let sentenceIndex = 0
  const shuffledRest = shuffle([...sentences.slice(1)])

  for (let p = 0; p < count; p++) {
    const sentencesInPara = 4 + Math.floor(Math.random() * 3) // 4, 5, or 6
    const paraSentences: string[] = []

    for (let s = 0; s < sentencesInPara; s++) {
      if (p === 0 && s === 0) {
        paraSentences.push(sentences[0]!)
      } else if (sentenceIndex < shuffledRest.length) {
        paraSentences.push(shuffledRest[sentenceIndex]!)
        sentenceIndex++
      } else {
        paraSentences.push(pickRandom(sentences))
      }
    }
    result.push(paraSentences.join(" "))
  }
  return result.join("\n\n")
}

const COPY_FEEDBACK_MS = 2000

export default function LoremIpsumPage() {
  const [count, setCount] = useState(3)
  const [unit, setUnit] = useState<LoremUnit>("paragraphs")
  const [copied, setCopied] = useState(false)

  const wordPool = useMemo(() => getAllWords(LOREM_SENTENCES), [])

  const output = useMemo(() => {
    const safeCount = Math.max(1, Math.min(50, count))
    return generateLorem(
      safeCount,
      unit,
      LOREM_SENTENCES,
      wordPool,
    )
  }, [count, unit, wordPool])

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), COPY_FEEDBACK_MS)
  }, [output])

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        Lorem Ipsum Generator
      </h1>
      <p className="text-muted-foreground mt-1">
        Generate placeholder text for your designs and mockups.
      </p>

      {/* Controls */}
      <div className="mt-8 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lorem-count">Count</Label>
          <Input
            id="lorem-count"
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10)
              if (!Number.isNaN(v)) setCount(v)
            }}
            className="w-24"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lorem-unit">Unit</Label>
          <Select value={unit} onValueChange={(v) => setUnit(v as LoremUnit)}>
            <SelectTrigger id="lorem-unit" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paragraphs">Paragraphs</SelectItem>
              <SelectItem value="sentences">Sentences</SelectItem>
              <SelectItem value="words">Words</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Output */}
      <div className="mt-6">
        <Textarea
          readOnly
          value={output}
          className="min-h-48 font-mono text-sm"
        />
        <Button
          variant="outline"
          onClick={handleCopy}
          className="mt-3"
          aria-label={copied ? "Copied" : "Copy to clipboard"}
        >
          {copied ? (
            <RiCheckLine
              className="size-4 text-green-600 dark:text-green-500"
              data-icon="inline-start"
            />
          ) : (
            <RiFileCopyLine data-icon="inline-start" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  )
}
