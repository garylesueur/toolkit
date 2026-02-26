"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  RiRefreshLine,
  RiFileCopyLine,
  RiCheckLine,
} from "@remixicon/react"

const LOWERCASE = "abcdefghijklmnopqrstuvwxyz"
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
const DIGITS = "0123456789"
const SYMBOLS = "!@#$%^&*()-_=+[]{}|;:,.<>?/"

const MIN_LENGTH = 4
const MAX_LENGTH = 128
const DEFAULT_LENGTH = 12
const COPY_RESET_MS = 2000

type CharsetKey = "lowercase" | "uppercase" | "numbers" | "symbols"

type CharsetOption = {
  key: CharsetKey
  label: string
  chars: string
}

const CHARSET_OPTIONS: CharsetOption[] = [
  { key: "lowercase", label: "a–z", chars: LOWERCASE },
  { key: "uppercase", label: "A–Z", chars: UPPERCASE },
  { key: "numbers", label: "0–9", chars: DIGITS },
  { key: "symbols", label: "!@#$", chars: SYMBOLS },
]

type CharsetState = Record<CharsetKey, boolean>

function buildAlphabet(charsets: CharsetState): string {
  let alphabet = ""
  for (const option of CHARSET_OPTIONS) {
    if (charsets[option.key]) {
      alphabet += option.chars
    }
  }
  return alphabet
}

/**
 * Generates a cryptographically random password from the given alphabet.
 * Uses rejection sampling to avoid modulo bias.
 */
function generatePassword(length: number, alphabet: string): string {
  if (alphabet.length === 0 || length <= 0) return ""

  const mask = alphabet.length - 1
  const bitsNeeded = Math.ceil(Math.log2(alphabet.length)) || 1
  const bytesPerChar = Math.ceil(bitsNeeded / 8)
  const maxValid = Math.floor(256 ** bytesPerChar / alphabet.length) * alphabet.length

  let result = ""
  while (result.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array((length - result.length) * bytesPerChar * 2))
    for (let i = 0; i <= bytes.length - bytesPerChar && result.length < length; i += bytesPerChar) {
      let value = 0
      for (let j = 0; j < bytesPerChar; j++) {
        value = (value << 8) | bytes[i + j]
      }
      if (value < maxValid) {
        result += alphabet[value % alphabet.length]
      }
    }
  }
  return result
}

export default function PasswordGeneratorPage() {
  const [length, setLength] = useState(DEFAULT_LENGTH)
  const [charsets, setCharsets] = useState<CharsetState>({
    lowercase: true,
    uppercase: true,
    numbers: true,
    symbols: false,
  })
  const [password, setPassword] = useState("")
  const [copied, setCopied] = useState(false)

  const alphabet = useMemo(() => buildAlphabet(charsets), [charsets])

  const regenerate = useCallback(() => {
    setPassword(generatePassword(length, alphabet))
  }, [length, alphabet])

  useEffect(() => {
    regenerate()
  }, [regenerate])

  const handleCopy = useCallback(async () => {
    if (!password) return
    await navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), COPY_RESET_MS)
  }, [password])

  const handleLengthChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    if (raw === "") {
      setLength(MIN_LENGTH)
      return
    }
    const parsed = parseInt(raw, 10)
    if (Number.isNaN(parsed)) return
    setLength(Math.max(MIN_LENGTH, Math.min(MAX_LENGTH, parsed)))
  }, [])

  const toggleCharset = useCallback((key: CharsetKey) => {
    setCharsets((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      const anyEnabled = Object.values(next).some(Boolean)
      if (!anyEnabled) return prev
      return next
    })
  }, [])

  const noCharsets = !Object.values(charsets).some(Boolean)

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        Password Generator
      </h1>
      <p className="text-muted-foreground mt-1">
        Generate a secure random password with configurable length and character
        sets.
      </p>

      {/* Generated password */}
      <div className="mt-8 flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
        <code className="min-w-0 flex-1 truncate font-mono text-sm select-all">
          {password || "—"}
        </code>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleCopy}
          disabled={!password}
          aria-label={copied ? "Copied" : "Copy password"}
        >
          {copied ? (
            <RiCheckLine className="size-4 text-green-600 dark:text-green-500" />
          ) : (
            <RiFileCopyLine className="size-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={regenerate}
          disabled={noCharsets}
          aria-label="Regenerate password"
        >
          <RiRefreshLine className="size-4" />
        </Button>
      </div>

      {/* Options */}
      <div className="mt-6 space-y-5">
        {/* Length */}
        <div className="flex items-center gap-3">
          <Label htmlFor="password-length" className="shrink-0">
            Length
          </Label>
          <Input
            id="password-length"
            type="number"
            min={MIN_LENGTH}
            max={MAX_LENGTH}
            value={length}
            onChange={handleLengthChange}
            className="w-24"
          />
        </div>

        {/* Character sets */}
        <div className="space-y-2">
          <Label>Character sets</Label>
          <div className="flex flex-wrap gap-2">
            {CHARSET_OPTIONS.map((option) => (
              <Button
                key={option.key}
                variant={charsets[option.key] ? "default" : "outline"}
                size="sm"
                onClick={() => toggleCharset(option.key)}
                aria-pressed={charsets[option.key]}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
