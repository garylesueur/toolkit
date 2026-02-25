"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface RegexMatch {
  index: number
  text: string
  groups: string[]
}

interface RegexResult {
  matches: RegexMatch[]
  error: string | null
}

const FLAG_OPTIONS: { flag: string; label: string }[] = [
  { flag: "g", label: "Global (g)" },
  { flag: "i", label: "Case-insensitive (i)" },
  { flag: "m", label: "Multiline (m)" },
  { flag: "s", label: "Dotall (s)" },
  { flag: "u", label: "Unicode (u)" },
]

function executeRegex(pattern: string, flags: string, testString: string): RegexResult {
  if (!pattern) {
    return { matches: [], error: null }
  }

  try {
    const flagsWithGlobal = flags.includes("g") ? flags : `g${flags}`
    const regex = new RegExp(pattern, flagsWithGlobal)
    const matches: RegexMatch[] = []

    let match: RegExpExecArray | null = regex.exec(testString)
    while (match !== null) {
      matches.push({
        index: match.index,
        text: match[0],
        groups: match.slice(1),
      })

      if (match[0].length === 0) {
        regex.lastIndex += 1
      }
      match = regex.exec(testString)
    }

    return { matches, error: null }
  } catch (err) {
    const message =
      err instanceof SyntaxError ? err.message : "Invalid regular expression"
    return { matches: [], error: message }
  }
}

interface HighlightedTextProps {
  text: string
  matches: RegexMatch[]
}

function HighlightedText({ text, matches }: HighlightedTextProps) {
  if (matches.length === 0) {
    return <span>{text}</span>
  }

  const parts: React.ReactNode[] = []
  let lastIndex = 0

  for (const match of matches) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {text.slice(lastIndex, match.index)}
        </span>,
      )
    }
    parts.push(
      <mark
        key={`match-${match.index}`}
        className="rounded-sm bg-primary/20 px-0.5 text-foreground"
      >
        {match.text}
      </mark>,
    )
    lastIndex = match.index + match.text.length
  }

  if (lastIndex < text.length) {
    parts.push(
      <span key={`text-${lastIndex}`}>{text.slice(lastIndex)}</span>,
    )
  }

  return <>{parts}</>
}

export default function RegexTesterPage() {
  const [pattern, setPattern] = useState("")
  const [flags, setFlags] = useState("g")
  const [testString, setTestString] = useState("")

  const { matches, error } = useMemo(
    () => executeRegex(pattern, flags, testString),
    [pattern, flags, testString],
  )

  const toggleFlag = (flag: string) => {
    setFlags((prev) =>
      prev.includes(flag)
        ? prev.replace(flag, "")
        : prev + flag,
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Regex Tester</h1>
      <p className="text-muted-foreground mt-1">
        Test regular expressions with live match highlighting and capture
        groups.
      </p>

      <div className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="regex-pattern">Pattern</Label>
          <Input
            id="regex-pattern"
            placeholder="e.g. (\w+)@(\w+)\.(\w+)"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            className="font-mono"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          {FLAG_OPTIONS.map(({ flag, label }) => (
            <label key={flag} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={flags.includes(flag)}
                onChange={() => toggleFlag(flag)}
                className="accent-primary"
              />
              {label}
            </label>
          ))}
        </div>

        <div className="space-y-2">
          <Label htmlFor="regex-test-string">Test string</Label>
          <Textarea
            id="regex-test-string"
            placeholder="Enter text to test against…"
            value={testString}
            onChange={(e) => setTestString(e.target.value)}
            className="min-h-32 resize-y"
          />
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {testString && pattern && !error && (
        <div className="mt-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold">
              Matches ({matches.length})
            </h2>
            <div className="mt-2 whitespace-pre-wrap rounded-md border bg-muted/50 p-4 font-mono text-sm">
              <HighlightedText text={testString} matches={matches} />
            </div>
          </div>

          {matches.length > 0 && matches.some((m) => m.groups.length > 0) && (
            <div>
              <h2 className="text-sm font-semibold">Capture Groups</h2>
              <div className="mt-2 space-y-2">
                {matches.map((match, matchIdx) => (
                  <div
                    key={matchIdx}
                    className="rounded-md border bg-muted/30 px-3 py-2"
                  >
                    <span className="text-muted-foreground text-xs">
                      Match {matchIdx + 1}:{" "}
                      <span className="font-mono text-foreground">
                        {match.text}
                      </span>
                    </span>
                    {match.groups.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-2">
                        {match.groups.map((group, groupIdx) => (
                          <span
                            key={groupIdx}
                            className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs"
                          >
                            ${groupIdx + 1}: {group}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
