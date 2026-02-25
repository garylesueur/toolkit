import type { OgTagData, OgFetchResult } from "./types"

const OG_PROPERTIES = [
  "og:title",
  "og:description",
  "og:image",
  "og:url",
  "og:type",
  "og:site_name",
  "og:locale",
] as const

const TWITTER_NAMES = [
  "twitter:card",
  "twitter:title",
  "twitter:description",
  "twitter:image",
  "twitter:site",
  "twitter:creator",
] as const

/**
 * Map from meta tag property/name to the corresponding key on OgTagData.
 * Keeps the mapping in one place so parseOgTags stays declarative.
 */
const TAG_TO_KEY: Record<string, keyof OgTagData> = {
  "og:title": "ogTitle",
  "og:description": "ogDescription",
  "og:image": "ogImage",
  "og:url": "ogUrl",
  "og:type": "ogType",
  "og:site_name": "ogSiteName",
  "og:locale": "ogLocale",
  "twitter:card": "twitterCard",
  "twitter:title": "twitterTitle",
  "twitter:description": "twitterDescription",
  "twitter:image": "twitterImage",
  "twitter:site": "twitterSite",
  "twitter:creator": "twitterCreator",
}

export function parseOgTags(html: string): OgTagData {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")

  const data: OgTagData = {
    ogTitle: null,
    ogDescription: null,
    ogImage: null,
    ogUrl: null,
    ogType: null,
    ogSiteName: null,
    ogLocale: null,
    twitterCard: null,
    twitterTitle: null,
    twitterDescription: null,
    twitterImage: null,
    twitterSite: null,
    twitterCreator: null,
    htmlTitle: null,
    metaDescription: null,
    rawTags: [],
  }

  const titleEl = doc.querySelector("title")
  if (titleEl) {
    data.htmlTitle = titleEl.textContent?.trim() ?? null
  }

  const descEl = doc.querySelector('meta[name="description"]')
  if (descEl) {
    data.metaDescription = descEl.getAttribute("content")?.trim() ?? null
  }

  for (const prop of OG_PROPERTIES) {
    const el = doc.querySelector(`meta[property="${prop}"]`)
    const content = el?.getAttribute("content")?.trim() ?? null
    const key = TAG_TO_KEY[prop]
    if (key && content) {
      ;(data[key] as string | null) = content
      data.rawTags.push({ property: prop, content })
    }
  }

  for (const name of TWITTER_NAMES) {
    const el =
      doc.querySelector(`meta[name="${name}"]`) ??
      doc.querySelector(`meta[property="${name}"]`)
    const content = el?.getAttribute("content")?.trim() ?? null
    const key = TAG_TO_KEY[name]
    if (key && content) {
      ;(data[key] as string | null) = content
      data.rawTags.push({ property: name, content })
    }
  }

  return data
}

/**
 * Normalise a user-entered URL so it always has a protocol.
 * e.g. "localhost:3000" -> "http://localhost:3000"
 */
export function normaliseUrl(raw: string): string {
  const trimmed = raw.trim()
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }
  return `http://${trimmed}`
}

/**
 * Resolve a potentially-relative OG image URL against the page's origin.
 */
export function resolveImageUrl(
  imageUrl: string | null,
  pageUrl: string,
): string | null {
  if (!imageUrl) return null
  try {
    return new URL(imageUrl, pageUrl).href
  } catch {
    return imageUrl
  }
}

export async function fetchAndParseOgTags(
  rawUrl: string,
): Promise<OgFetchResult> {
  const url = normaliseUrl(rawUrl)

  try {
    const response = await fetch(url, {
      mode: "cors",
      headers: { Accept: "text/html" },
    })

    if (!response.ok) {
      return {
        ok: false,
        error: `Server returned ${response.status} ${response.statusText}`,
        isCors: false,
      }
    }

    const html = await response.text()
    const data = parseOgTags(html)

    return { ok: true, data }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const isCors =
      message.includes("Failed to fetch") ||
      message.includes("NetworkError") ||
      message.includes("CORS") ||
      message.includes("Load failed")

    return {
      ok: false,
      error: isCors
        ? "Could not fetch the URL. This is likely a CORS issue — the target server needs to allow cross-origin requests from this page."
        : `Fetch failed: ${message}`,
      isCors,
    }
  }
}
