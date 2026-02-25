"use client"

import { useState, useCallback, useRef } from "react"
import { fetchAndParseOgTags, normaliseUrl, resolveImageUrl } from "@/lib/og-preview/parse"
import type { OgTagData, OgFetchResult } from "@/lib/og-preview/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  RiSearchLine,
  RiLoader4Line,
  RiAlertLine,
  RiCheckLine,
  RiCloseLine,
} from "@remixicon/react"

const RECOMMENDED_TAGS = [
  "og:title",
  "og:description",
  "og:image",
  "og:url",
  "twitter:card",
  "twitter:title",
  "twitter:description",
  "twitter:image",
]

type PlatformPreviewProps = {
  data: OgTagData
  pageUrl: string
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + "…"
}

// ─── Twitter/X Preview ───────────────────────────────────────────────

function TwitterPreview({ data, pageUrl }: PlatformPreviewProps) {
  const title = data.twitterTitle ?? data.ogTitle ?? data.htmlTitle ?? "Untitled"
  const description = data.twitterDescription ?? data.ogDescription ?? data.metaDescription ?? ""
  const image = resolveImageUrl(data.twitterImage ?? data.ogImage, pageUrl)
  const domain = getDomain(pageUrl)
  const cardType = data.twitterCard ?? "summary_large_image"
  const isLargeCard = cardType === "summary_large_image"

  if (isLargeCard) {
    return (
      <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700">
        {image && (
          <div className="aspect-[1.91/1] w-full bg-neutral-100 dark:bg-neutral-800">
            <img
              src={image}
              alt=""
              className="size-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none"
              }}
            />
          </div>
        )}
        <div className="border-t border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-xs text-neutral-500">{domain}</p>
          <p className="mt-0.5 text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {truncate(title, 70)}
          </p>
          {description && (
            <p className="mt-0.5 text-xs text-neutral-500">
              {truncate(description, 200)}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700">
      {image && (
        <div className="flex size-32 shrink-0 items-center justify-center bg-neutral-100 dark:bg-neutral-800">
          <img
            src={image}
            alt=""
            className="size-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none"
            }}
          />
        </div>
      )}
      <div className="flex flex-col justify-center border-l border-neutral-200 p-3 dark:border-neutral-700">
        <p className="text-xs text-neutral-500">{domain}</p>
        <p className="mt-0.5 text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {truncate(title, 70)}
        </p>
        {description && (
          <p className="mt-0.5 text-xs text-neutral-500">
            {truncate(description, 100)}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Facebook Preview ────────────────────────────────────────────────

function FacebookPreview({ data, pageUrl }: PlatformPreviewProps) {
  const title = data.ogTitle ?? data.htmlTitle ?? "Untitled"
  const description = data.ogDescription ?? data.metaDescription ?? ""
  const image = resolveImageUrl(data.ogImage, pageUrl)
  const domain = getDomain(pageUrl).toUpperCase()

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-300 bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-800">
      {image && (
        <div className="aspect-[1.91/1] w-full bg-neutral-200 dark:bg-neutral-700">
          <img
            src={image}
            alt=""
            className="size-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none"
            }}
          />
        </div>
      )}
      <div className="border-t border-neutral-300 px-3 py-2.5 dark:border-neutral-600">
        <p className="text-xs font-normal uppercase tracking-wide text-neutral-500">
          {domain}
        </p>
        <p className="mt-0.5 text-sm font-semibold leading-snug text-neutral-900 dark:text-neutral-100">
          {truncate(title, 65)}
        </p>
        {description && (
          <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">
            {truncate(description, 155)}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── LinkedIn Preview ────────────────────────────────────────────────

function LinkedInPreview({ data, pageUrl }: PlatformPreviewProps) {
  const title = data.ogTitle ?? data.htmlTitle ?? "Untitled"
  const image = resolveImageUrl(data.ogImage, pageUrl)
  const source = data.ogSiteName ?? getDomain(pageUrl)

  return (
    <div className="overflow-hidden rounded-sm border border-neutral-300 bg-white dark:border-neutral-600 dark:bg-neutral-900">
      {image && (
        <div className="aspect-[1.91/1] w-full bg-neutral-200 dark:bg-neutral-700">
          <img
            src={image}
            alt=""
            className="size-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none"
            }}
          />
        </div>
      )}
      <div className="border-t border-neutral-300 px-3 py-2 dark:border-neutral-600">
        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {truncate(title, 120)}
        </p>
        <p className="mt-0.5 text-xs text-neutral-500">{source}</p>
      </div>
    </div>
  )
}

// ─── Discord Preview ─────────────────────────────────────────────────

function DiscordPreview({ data, pageUrl }: PlatformPreviewProps) {
  const title = data.ogTitle ?? data.htmlTitle ?? "Untitled"
  const description = data.ogDescription ?? data.metaDescription ?? ""
  const image = resolveImageUrl(data.ogImage, pageUrl)
  const siteName = data.ogSiteName ?? getDomain(pageUrl)

  return (
    <div className="flex max-w-md overflow-hidden rounded bg-[#2b2d31]">
      <div className="w-1 shrink-0 rounded-l bg-[#1e1f22]" />
      <div className="flex flex-col gap-2 p-3">
        <p className="text-xs font-medium text-[#00a8fc]">{siteName}</p>
        <p className="text-sm font-semibold text-white">{truncate(title, 256)}</p>
        {description && (
          <p className="text-sm leading-snug text-[#dbdee1]">
            {truncate(description, 350)}
          </p>
        )}
        {image && (
          <div className="mt-1 max-w-sm overflow-hidden rounded">
            <img
              src={image}
              alt=""
              className="w-full rounded object-cover"
              style={{ maxHeight: 200 }}
              onError={(e) => {
                e.currentTarget.style.display = "none"
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Slack Preview ───────────────────────────────────────────────────

function SlackPreview({ data, pageUrl }: PlatformPreviewProps) {
  const title = data.ogTitle ?? data.htmlTitle ?? "Untitled"
  const description = data.ogDescription ?? data.metaDescription ?? ""
  const image = resolveImageUrl(data.ogImage, pageUrl)
  const siteName = data.ogSiteName ?? getDomain(pageUrl)

  return (
    <div className="flex max-w-lg">
      <div className="w-1 shrink-0 rounded-full bg-neutral-400 dark:bg-neutral-500" />
      <div className="flex flex-col gap-1 pl-3">
        <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
          {siteName}
        </p>
        <p className="text-sm font-bold text-[#1264a3] dark:text-[#1d9bd1]">
          {truncate(title, 150)}
        </p>
        {description && (
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            {truncate(description, 300)}
          </p>
        )}
        {image && (
          <div className="mt-1 max-w-xs overflow-hidden rounded">
            <img
              src={image}
              alt=""
              className="w-full rounded object-cover"
              style={{ maxHeight: 180 }}
              onError={(e) => {
                e.currentTarget.style.display = "none"
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tag Status Indicator ────────────────────────────────────────────

function TagStatus({ present }: { present: boolean }) {
  if (present) {
    return (
      <Badge variant="secondary" className="gap-1">
        <RiCheckLine className="size-3" />
        Set
      </Badge>
    )
  }
  return (
    <Badge variant="destructive" className="gap-1">
      <RiCloseLine className="size-3" />
      Missing
    </Badge>
  )
}

// ─── CORS Help Panel ─────────────────────────────────────────────────

function CorsHelp() {
  return (
    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/50">
      <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
        How to enable CORS on your dev server:
      </p>
      <div className="mt-3 space-y-3 text-xs text-amber-800 dark:text-amber-300">
        <div>
          <p className="font-semibold">Next.js (next.config.ts)</p>
          <pre className="bg-amber-100/50 mt-1 overflow-x-auto rounded p-2 dark:bg-amber-900/30">
            {`headers: () => [{\n  source: "/:path*",\n  headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],\n}]`}
          </pre>
        </div>
        <div>
          <p className="font-semibold">Vite (vite.config.ts)</p>
          <pre className="bg-amber-100/50 mt-1 overflow-x-auto rounded p-2 dark:bg-amber-900/30">
            {`server: {\n  cors: true,\n}`}
          </pre>
        </div>
        <div>
          <p className="font-semibold">Express</p>
          <pre className="bg-amber-100/50 mt-1 overflow-x-auto rounded p-2 dark:bg-amber-900/30">
            {`app.use(cors())`}
          </pre>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────

export default function OgPreviewPage() {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<OgFetchResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFetch = useCallback(async () => {
    const trimmed = url.trim()
    if (!trimmed) return

    setLoading(true)
    setResult(null)

    const fetchResult = await fetchAndParseOgTags(trimmed)
    setResult(fetchResult)
    setLoading(false)
  }, [url])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleFetch()
      }
    },
    [handleFetch],
  )

  const data = result?.ok ? result.data : null
  const pageUrl = normaliseUrl(url)

  const presentTags = data
    ? RECOMMENDED_TAGS.map((tag) => {
        const raw = data.rawTags.find((r) => r.property === tag)
        return { tag, present: raw !== undefined }
      })
    : null

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Open Graph Preview</h1>
      <p className="text-muted-foreground mt-1">
        Enter a URL to inspect its Open Graph tags and preview how the link
        appears on social platforms.
      </p>

      {/* URL input */}
      <div className="mt-8 flex gap-3">
        <input
          ref={inputRef}
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="localhost:3000"
          className="dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 flex-1 rounded-md border bg-transparent px-2.5 py-1 text-sm shadow-xs transition-[color,box-shadow] placeholder:text-muted-foreground outline-none focus-visible:ring-3"
        />
        <Button onClick={handleFetch} disabled={loading || !url.trim()}>
          {loading ? (
            <RiLoader4Line className="size-4 animate-spin" data-icon="inline-start" />
          ) : (
            <RiSearchLine data-icon="inline-start" />
          )}
          {loading ? "Fetching…" : "Fetch"}
        </Button>
      </div>

      {/* Error state */}
      {result && !result.ok && (
        <div className="mt-6">
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <RiAlertLine className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-medium text-destructive">
                {result.error}
              </p>
            </div>
          </div>
          {result.isCors && <CorsHelp />}
        </div>
      )}

      {/* Results */}
      {data && (
        <div className="mt-10 space-y-12">
          {/* Recommended tags checklist */}
          <section>
            <h2 className="text-lg font-semibold">Tag Checklist</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Recommended tags for good social sharing coverage.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {presentTags?.map(({ tag, present }) => (
                <div
                  key={tag}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <code className="text-xs">{tag}</code>
                  <TagStatus present={present} />
                </div>
              ))}
            </div>
          </section>

          {/* Raw tags table */}
          <section>
            <h2 className="text-lg font-semibold">All Detected Tags</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Every Open Graph and Twitter meta tag found on the page.
            </p>
            {data.rawTags.length === 0 ? (
              <p className="text-muted-foreground mt-4 text-sm">
                No OG or Twitter meta tags found.
              </p>
            ) : (
              <div className="mt-4 overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium">
                        Property
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        Content
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.htmlTitle && (
                      <tr className="border-b">
                        <td className="px-3 py-2">
                          <code className="text-xs">&lt;title&gt;</code>
                        </td>
                        <td className="px-3 py-2 break-all">
                          {data.htmlTitle}
                        </td>
                      </tr>
                    )}
                    {data.metaDescription && (
                      <tr className="border-b">
                        <td className="px-3 py-2">
                          <code className="text-xs">meta description</code>
                        </td>
                        <td className="px-3 py-2 break-all">
                          {data.metaDescription}
                        </td>
                      </tr>
                    )}
                    {data.rawTags.map(({ property, content }) => (
                      <tr key={property} className="border-b last:border-b-0">
                        <td className="px-3 py-2">
                          <code className="text-xs">{property}</code>
                        </td>
                        <td className="px-3 py-2 break-all">{content}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Platform previews */}
          <section>
            <h2 className="text-lg font-semibold">Platform Previews</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Approximate previews of how this link would appear when shared.
            </p>

            <div className="mt-6 space-y-8">
              {/* Twitter/X */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                  Twitter / X
                </h3>
                <div className="max-w-md">
                  <TwitterPreview data={data} pageUrl={pageUrl} />
                </div>
              </div>

              {/* Facebook */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                  Facebook
                </h3>
                <div className="max-w-lg">
                  <FacebookPreview data={data} pageUrl={pageUrl} />
                </div>
              </div>

              {/* LinkedIn */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                  LinkedIn
                </h3>
                <div className="max-w-lg">
                  <LinkedInPreview data={data} pageUrl={pageUrl} />
                </div>
              </div>

              {/* Discord */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                  Discord
                </h3>
                <DiscordPreview data={data} pageUrl={pageUrl} />
              </div>

              {/* Slack */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                  Slack
                </h3>
                <SlackPreview data={data} pageUrl={pageUrl} />
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
