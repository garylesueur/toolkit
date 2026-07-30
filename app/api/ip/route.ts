import { NextResponse } from "next/server";

import { classifyScope, detectVersion } from "@/lib/ip/format";
import type { IpGeo, IpHeader, IpLookupResult } from "@/lib/ip/types";

/**
 * The root layout sets `revalidate = 31536000`, so without these opt-outs Next
 * would evaluate this route once and serve every visitor the same cached IP.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Ordered by trustworthiness. On Vercel the edge sets `x-vercel-forwarded-for`
 * and overwrites `x-forwarded-for`, so neither can be spoofed by the client;
 * behind another proxy the first entry of the chain is the closest we can get.
 */
const IP_HEADERS = [
  "x-vercel-forwarded-for",
  "x-real-ip",
  "x-forwarded-for",
] as const;

/**
 * Only these are echoed back. An allowlist rather than a denylist: the page
 * renders the list verbatim, and the platform injects headers we do not control
 * — `x-vercel-oidc-token` is a signed JWT, and the set grows with every Vercel
 * feature. Enumerating what is safe to show is the only version that stays safe.
 */
const ECHOED_HEADERS = new Set([
  "accept",
  "accept-encoding",
  "accept-language",
  "cache-control",
  "connection",
  "dnt",
  "host",
  "referer",
  "sec-ch-ua",
  "sec-ch-ua-mobile",
  "sec-ch-ua-platform",
  "sec-fetch-dest",
  "sec-fetch-mode",
  "sec-fetch-site",
  "sec-gpc",
  "upgrade-insecure-requests",
  "user-agent",
  "via",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-real-ip",
  "x-vercel-forwarded-for",
  "x-vercel-ip-city",
  "x-vercel-ip-country",
  "x-vercel-ip-country-region",
  "x-vercel-ip-latitude",
  "x-vercel-ip-longitude",
  "x-vercel-ip-postal-code",
  "x-vercel-ip-timezone",
]);

function firstAddress(value: string): string | null {
  const first = value.split(",")[0]?.trim();
  return first && first.length > 0 ? first : null;
}

function resolveIp(headers: Headers): {
  ip: string | null;
  source: string | null;
} {
  for (const name of IP_HEADERS) {
    const raw = headers.get(name);
    if (!raw) continue;

    const ip = firstAddress(raw);
    if (ip) return { ip, source: name };
  }

  return { ip: null, source: null };
}

/** Vercel percent-encodes geo values so they survive as ASCII header text. */
function decodeGeoValue(value: string | null): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function readGeo(headers: Headers): IpGeo {
  return {
    country: decodeGeoValue(headers.get("x-vercel-ip-country")),
    countryRegion: decodeGeoValue(headers.get("x-vercel-ip-country-region")),
    city: decodeGeoValue(headers.get("x-vercel-ip-city")),
    latitude: decodeGeoValue(headers.get("x-vercel-ip-latitude")),
    longitude: decodeGeoValue(headers.get("x-vercel-ip-longitude")),
    timezone: decodeGeoValue(headers.get("x-vercel-ip-timezone")),
    postalCode: decodeGeoValue(headers.get("x-vercel-ip-postal-code")),
  };
}

function readHeaders(headers: Headers): IpHeader[] {
  const entries: IpHeader[] = [];

  for (const [name, value] of headers.entries()) {
    if (!ECHOED_HEADERS.has(name.toLowerCase())) continue;
    entries.push({ name, value });
  }

  entries.sort((a, b) => (a.name < b.name ? -1 : 1));
  return entries;
}

export function GET(request: Request): NextResponse<IpLookupResult> {
  const { headers } = request;
  const { ip, source } = resolveIp(headers);

  const body: IpLookupResult = {
    ok: true,
    data: {
      ip,
      source,
      version: ip ? detectVersion(ip) : "unknown",
      scope: ip ? classifyScope(ip) : "unknown",
      geo: readGeo(headers),
      headers: readHeaders(headers),
    },
  };

  return NextResponse.json(body, {
    headers: {
      "cache-control": "no-store, max-age=0",
    },
  });
}
