/** Production fallback when `NEXT_PUBLIC_SITE_URL` is unset (local dev, tests). */
const DEFAULT_SITE_URL = "https://toolkit.lesueur.uk";

/**
 * Canonical origin for the site (no trailing slash).
 * Set `NEXT_PUBLIC_SITE_URL` in Vercel for preview/staging overrides.
 */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  const url =
    configured && configured.length > 0 ? configured : DEFAULT_SITE_URL;
  return url.replace(/\/$/, "");
}

/** Absolute URL for a path on this site. */
export function canonicalPath(path: string): string {
  const base = getSiteUrl();
  const normalised = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalised}`;
}

/** True on Vercel preview deployments — used for noindex crawl rules. */
export function isPreviewDeployment(): boolean {
  return process.env.VERCEL_ENV === "preview";
}
