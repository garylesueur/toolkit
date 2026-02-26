"use client"

import { useState, useCallback, useEffect } from "react"
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
import {
  RiRefreshLine,
  RiFileCopyLine,
  RiCheckLine,
  RiShieldCheckLine,
} from "@remixicon/react"

type Encoding = "base64" | "base64url" | "hex"

type EncodingOption = {
  value: Encoding
  label: string
}

const ENCODING_OPTIONS: EncodingOption[] = [
  { value: "base64", label: "Base64" },
  { value: "base64url", label: "Base64-URL" },
  { value: "hex", label: "Hex" },
]

type ByteLengthOption = {
  value: number
  label: string
}

const BYTE_LENGTH_OPTIONS: ByteLengthOption[] = [
  { value: 16, label: "16 bytes (128-bit)" },
  { value: 32, label: "32 bytes (256-bit)" },
  { value: 64, label: "64 bytes (512-bit)" },
  { value: 128, label: "128 bytes (1024-bit)" },
]

const DEFAULT_BYTE_LENGTH = 32
const DEFAULT_ENCODING: Encoding = "base64"
const DEFAULT_COUNT = 1
const MIN_COUNT = 1
const MAX_COUNT = 10
const COPY_RESET_MS = 2000

function generateRandomBytes(byteLength: number): Uint8Array {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return bytes
}

function encodeBytes(bytes: Uint8Array, encoding: Encoding): string {
  switch (encoding) {
    case "base64": {
      let binary = ""
      for (const byte of bytes) {
        binary += String.fromCharCode(byte)
      }
      return btoa(binary)
    }
    case "base64url": {
      let binary = ""
      for (const byte of bytes) {
        binary += String.fromCharCode(byte)
      }
      return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "")
    }
    case "hex": {
      let hex = ""
      for (const byte of bytes) {
        hex += byte.toString(16).padStart(2, "0")
      }
      return hex
    }
  }
}

function generateSecrets(
  count: number,
  byteLength: number,
  encoding: Encoding,
): string[] {
  const secrets: string[] = []
  for (let i = 0; i < count; i++) {
    const bytes = generateRandomBytes(byteLength)
    secrets.push(encodeBytes(bytes, encoding))
  }
  return secrets
}

export default function SecretGeneratorPage() {
  const [byteLength, setByteLength] = useState(DEFAULT_BYTE_LENGTH)
  const [encoding, setEncoding] = useState<Encoding>(DEFAULT_ENCODING)
  const [count, setCount] = useState(DEFAULT_COUNT)
  const [secrets, setSecrets] = useState<string[]>([])
  const [copiedValue, setCopiedValue] = useState<string | null>(null)

  const regenerate = useCallback(() => {
    setSecrets(generateSecrets(count, byteLength, encoding))
    setCopiedValue(null)
  }, [count, byteLength, encoding])

  useEffect(() => {
    regenerate()
  }, [regenerate])

  const handleCopy = useCallback((value: string) => {
    navigator.clipboard.writeText(value)
    setCopiedValue(value)
    setTimeout(() => setCopiedValue(null), COPY_RESET_MS)
  }, [])

  const handleCopyAll = useCallback(() => {
    const joined = secrets.join("\n")
    navigator.clipboard.writeText(joined)
    setCopiedValue(joined)
    setTimeout(() => setCopiedValue(null), COPY_RESET_MS)
  }, [secrets])

  const handleCountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      if (raw === "") {
        setCount(MIN_COUNT)
        return
      }
      const parsed = parseInt(raw, 10)
      if (Number.isNaN(parsed)) return
      setCount(Math.max(MIN_COUNT, Math.min(MAX_COUNT, parsed)))
    },
    [],
  )

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        Secret / Token Generator
      </h1>
      <p className="text-muted-foreground mt-1">
        Generate cryptographically random secrets for API keys, JWT secrets,
        encryption keys, and more.
      </p>

      <div className="mt-3 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
        <RiShieldCheckLine className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-primary">
          Your secrets are generated entirely in your browser using the Web
          Crypto API. Nothing is stored, logged, or sent to a server.
        </p>
      </div>

      {/* Controls */}
      <div className="mt-8 flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label>Byte length</Label>
          <Select
            value={String(byteLength)}
            onValueChange={(v) => setByteLength(Number(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BYTE_LENGTH_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Encoding</Label>
          <Select
            value={encoding}
            onValueChange={(v) => setEncoding(v as Encoding)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENCODING_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="secret-count">Count</Label>
          <Input
            id="secret-count"
            type="number"
            min={MIN_COUNT}
            max={MAX_COUNT}
            value={count}
            onChange={handleCountChange}
            className="w-20"
          />
        </div>
      </div>

      {/* Output */}
      <div className="mt-6 space-y-2">
        {secrets.map((secret, index) => {
          const isCopied = copiedValue === secret
          return (
            <div
              key={`${index}-${secret}`}
              className="flex items-center justify-between gap-4 rounded-md border bg-muted/30 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                {count > 1 && (
                  <span className="text-muted-foreground text-xs">
                    Secret {index + 1}
                  </span>
                )}
                <p className="truncate font-mono text-sm select-all">
                  {secret}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => handleCopy(secret)}
                aria-label={isCopied ? "Copied" : `Copy secret ${index + 1}`}
              >
                {isCopied ? (
                  <RiCheckLine className="size-4 text-green-600 dark:text-green-500" />
                ) : (
                  <RiFileCopyLine className="size-4" />
                )}
              </Button>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={regenerate}>
          <RiRefreshLine data-icon="inline-start" className="size-4" />
          Regenerate
        </Button>
        {count > 1 && (
          <Button variant="outline" size="sm" onClick={handleCopyAll}>
            <RiFileCopyLine data-icon="inline-start" className="size-4" />
            {copiedValue === secrets.join("\n") ? "Copied all" : "Copy all"}
          </Button>
        )}
      </div>
    </div>
  )
}
