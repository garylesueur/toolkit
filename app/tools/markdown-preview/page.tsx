"use client"

import { useState, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RiFileCopyLine, RiCheckLine } from "@remixicon/react"
import { marked } from "marked"

const COPY_RESET_MS = 2000

const SAMPLE_MARKDOWN = `# Hello, Markdown!

This is a **live preview** of your Markdown.

## Features

- Write Markdown on the left
- See the rendered output on the right
- Copy the HTML with one click

> Blockquotes look like this.

\`\`\`javascript
const greeting = "Hello, world!";
console.log(greeting);
\`\`\`

| Feature | Status |
|---------|--------|
| Bold    | ✓      |
| Italic  | ✓      |
| Code    | ✓      |
`

export default function MarkdownPreviewPage() {
  const [input, setInput] = useState(SAMPLE_MARKDOWN)
  const [copied, setCopied] = useState(false)

  const html = useMemo(() => marked.parse(input) as string, [input])

  const handleCopy = useCallback(async () => {
    if (!html) return
    await navigator.clipboard.writeText(html)
    setCopied(true)
    setTimeout(() => setCopied(false), COPY_RESET_MS)
  }, [html])

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Markdown Preview</h1>
      <p className="text-muted-foreground mt-1">
        Write Markdown and see a live rendered preview side by side.
      </p>

      <div className="mt-6 flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          disabled={!html}
        >
          {copied ? (
            <RiCheckLine className="mr-1.5 size-4" />
          ) : (
            <RiFileCopyLine className="mr-1.5 size-4" />
          )}
          {copied ? "Copied!" : "Copy as HTML"}
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="markdown-input">Markdown</Label>
          <Textarea
            id="markdown-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="min-h-[500px] resize-y font-mono text-sm"
            placeholder="Write your Markdown here…"
          />
        </div>

        <div className="space-y-2">
          <Label>Preview</Label>
          <div
            className="markdown-preview min-h-[500px] rounded-md border bg-background p-6 text-sm"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  )
}
