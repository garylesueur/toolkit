"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { RiFileCopyLine, RiCheckLine } from "@remixicon/react"
import {
  computeAllHashes,
  HASH_ALGORITHMS,
} from "@/lib/hash/generate"
import type { HashAlgorithm, HashResults } from "@/lib/hash/generate"

const COPY_RESET_MS = 2000

interface HashRowProps {
  label: HashAlgorithm
  value: string
  copiedValue: string | null
  onCopy: (value: string) => void
}

function HashRow({ label, value, copiedValue, onCopy }: HashRowProps) {
  const isCopied = copiedValue === value

  return (
    <div className="flex items-center justify-between gap-4 rounded-md border bg-muted/30 px-3 py-2">
      <div className="min-w-0 flex-1">
        <span className="text-muted-foreground text-xs">{label}</span>
        <p className="truncate font-mono text-sm">{value}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onCopy(value)}
        disabled={!value}
      >
        {isCopied ? <RiCheckLine /> : <RiFileCopyLine />}
      </Button>
    </div>
  )
}

const EMPTY_RESULTS: HashResults = Object.fromEntries(
  HASH_ALGORITHMS.map((alg) => [alg, ""]),
) as HashResults

export default function HashGeneratorPage() {
  const [input, setInput] = useState("")
  const [results, setResults] = useState<HashResults>(EMPTY_RESULTS)
  const [copiedValue, setCopiedValue] = useState<string | null>(null)

  useEffect(() => {
    const text = input
    if (!text) {
      setResults(EMPTY_RESULTS)
      return
    }

    let cancelled = false
    computeAllHashes(text).then((hashes) => {
      if (!cancelled) setResults(hashes)
    })

    return () => {
      cancelled = true
    }
  }, [input])

  const handleCopy = useCallback(async (value: string) => {
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopiedValue(value)
    setTimeout(() => setCopiedValue(null), COPY_RESET_MS)
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Hash Generator</h1>
      <p className="text-muted-foreground mt-1">
        Enter text to compute SHA-1, SHA-256, SHA-384, and SHA-512 hashes.
      </p>

      <div className="mt-8">
        <label htmlFor="hash-input" className="sr-only">
          Text to hash
        </label>
        <Textarea
          id="hash-input"
          placeholder="Enter text to hash…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="min-h-32 resize-y"
        />
      </div>

      <div className="mt-6 space-y-2">
        {HASH_ALGORITHMS.map((alg) => (
          <HashRow
            key={alg}
            label={alg}
            value={results[alg]}
            copiedValue={copiedValue}
            onCopy={handleCopy}
          />
        ))}
      </div>
    </div>
  )
}
