"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { diffLines, diffWords } from "diff"
import type { Change } from "diff"

type DiffMode = "lines" | "words"

function computeDiff(original: string, modified: string, mode: DiffMode): Change[] {
  if (!original && !modified) return []
  if (mode === "words") return diffWords(original, modified)
  return diffLines(original, modified)
}

interface DiffOutputProps {
  changes: Change[]
}

function DiffOutput({ changes }: DiffOutputProps) {
  if (changes.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Enter text in both fields to see the diff.
      </p>
    )
  }

  return (
    <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border bg-muted/50 p-4 font-mono text-sm">
      {changes.map((change, idx) => {
        if (change.added) {
          return (
            <span key={idx} className="bg-green-500/20 text-green-700 dark:text-green-400">
              {change.value}
            </span>
          )
        }
        if (change.removed) {
          return (
            <span key={idx} className="bg-red-500/20 text-red-700 line-through dark:text-red-400">
              {change.value}
            </span>
          )
        }
        return <span key={idx}>{change.value}</span>
      })}
    </pre>
  )
}

export default function DiffViewerPage() {
  const [original, setOriginal] = useState("")
  const [modified, setModified] = useState("")
  const [mode, setMode] = useState<DiffMode>("lines")

  const changes = useMemo(
    () => computeDiff(original, modified, mode),
    [original, modified, mode],
  )

  const stats = useMemo(() => {
    let additions = 0
    let deletions = 0
    for (const change of changes) {
      if (change.added) additions++
      if (change.removed) deletions++
    }
    return { additions, deletions }
  }, [changes])

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Diff Viewer</h1>
      <p className="text-muted-foreground mt-1">
        Compare two blocks of text and see additions and deletions highlighted.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="diff-original">Original</Label>
          <Textarea
            id="diff-original"
            placeholder="Paste original text…"
            value={original}
            onChange={(e) => setOriginal(e.target.value)}
            className="min-h-40 resize-y"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="diff-modified">Modified</Label>
          <Textarea
            id="diff-modified"
            placeholder="Paste modified text…"
            value={modified}
            onChange={(e) => setModified(e.target.value)}
            className="min-h-40 resize-y"
          />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <div className="flex gap-0 rounded-md border p-0.5">
          <Button
            variant={mode === "lines" ? "default" : "outline"}
            className="rounded-md border-0"
            size="sm"
            onClick={() => setMode("lines")}
          >
            Line diff
          </Button>
          <Button
            variant={mode === "words" ? "default" : "outline"}
            className="rounded-md border-0"
            size="sm"
            onClick={() => setMode("words")}
          >
            Word diff
          </Button>
        </div>

        {(stats.additions > 0 || stats.deletions > 0) && (
          <div className="flex gap-3 text-xs font-medium">
            <span className="text-green-700 dark:text-green-400">
              +{stats.additions}
            </span>
            <span className="text-red-700 dark:text-red-400">
              −{stats.deletions}
            </span>
          </div>
        )}
      </div>

      <div className="mt-4">
        <DiffOutput changes={changes} />
      </div>
    </div>
  )
}
