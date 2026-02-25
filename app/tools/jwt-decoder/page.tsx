"use client"

import { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { RiFileCopyLine, RiCheckLine } from "@remixicon/react"
import { decodeJwt, isTokenExpired, formatExpiry } from "@/lib/jwt/decode"

const COPY_RESET_MS = 2000

export default function JwtDecoderPage() {
  const [input, setInput] = useState("")
  const [copiedSection, setCopiedSection] = useState<string | null>(null)

  const { decoded, error } = useMemo(() => decodeJwt(input), [input])

  const expired = useMemo(() => {
    if (!decoded) return null
    return isTokenExpired(decoded.payload)
  }, [decoded])

  const expiryLabel = useMemo(() => {
    if (!decoded) return null
    const exp = decoded.payload.exp
    if (typeof exp !== "number") return null
    return formatExpiry(exp)
  }, [decoded])

  const headerJson = useMemo(
    () => (decoded ? JSON.stringify(decoded.header, null, 2) : ""),
    [decoded],
  )

  const payloadJson = useMemo(
    () => (decoded ? JSON.stringify(decoded.payload, null, 2) : ""),
    [decoded],
  )

  const handleCopy = useCallback(async (value: string, section: string) => {
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopiedSection(section)
    setTimeout(() => setCopiedSection(null), COPY_RESET_MS)
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">JWT Decoder</h1>
      <p className="text-muted-foreground mt-1">
        Paste a JSON Web Token to decode its header and payload.
      </p>

      <div className="mt-8">
        <label htmlFor="jwt-input" className="sr-only">
          JWT input
        </label>
        <Textarea
          id="jwt-input"
          placeholder="Paste a JWT here… e.g. eyJhbGciOiJIUzI1NiIs…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="min-h-24 resize-y font-mono text-sm"
        />
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {decoded && (
        <div className="mt-6 space-y-6">
          {expired !== null && (
            <div className="flex items-center gap-2">
              <Badge variant={expired ? "destructive" : "secondary"}>
                {expired ? "Expired" : "Valid"}
              </Badge>
              {expiryLabel && (
                <span className="text-muted-foreground text-sm">
                  {expired ? "Expired" : "Expires"} {expiryLabel}
                </span>
              )}
            </div>
          )}

          <section>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Header</h2>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleCopy(headerJson, "header")}
              >
                {copiedSection === "header" ? (
                  <RiCheckLine />
                ) : (
                  <RiFileCopyLine />
                )}
              </Button>
            </div>
            <pre className="mt-2 overflow-x-auto rounded-md border bg-muted/50 p-4 font-mono text-sm">
              {headerJson}
            </pre>
          </section>

          <section>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Payload</h2>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleCopy(payloadJson, "payload")}
              >
                {copiedSection === "payload" ? (
                  <RiCheckLine />
                ) : (
                  <RiFileCopyLine />
                )}
              </Button>
            </div>
            <pre className="mt-2 overflow-x-auto rounded-md border bg-muted/50 p-4 font-mono text-sm">
              {payloadJson}
            </pre>
          </section>
        </div>
      )}
    </div>
  )
}
