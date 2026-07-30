import {
  resolveAsnService,
  resolveDomainService,
  resolveIpService,
} from "./bootstrap";
import { mergeRdapRecords, parseRdapRecord } from "./parse";
import type { LookupTarget, RdapLookupResult, RdapRecord } from "./types";

const RDAP_ACCEPT = "application/rdap+json, application/json";
const REQUEST_TIMEOUT_MS = 10000;

const NOT_FOUND_STATUS = 404;

type FetchOutcome =
  | { kind: "ok"; json: unknown }
  | { kind: "not-found" }
  | { kind: "error"; message: string };

async function fetchRdap(url: string): Promise<FetchOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { Accept: RDAP_ACCEPT },
      signal: controller.signal,
    });

    if (response.status === NOT_FOUND_STATUS) return { kind: "not-found" };
    if (!response.ok) {
      return {
        kind: "error",
        message: `The RDAP server returned ${response.status} ${response.statusText}.`,
      };
    }

    return { kind: "ok", json: await response.json() };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("aborted") || message.includes("abort")) {
      return {
        kind: "error",
        message: "The RDAP server did not respond in time.",
      };
    }
    return {
      kind: "error",
      message:
        `Could not reach the RDAP server (${message}). ` +
        "It may be down, or it may not send the CORS headers a browser needs.",
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Hostnames that must never be fetched — see `isSafeRelatedUrl`. */
const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /\.localhost$/i,
  /^127\./,
  /^0\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^\[?::1\]?$/,
  /^\[?f[cd][0-9a-f]{2}:/i,
];

/**
 * The `related` href comes from whatever the registry chose to return, so it is
 * third-party input we then hand to `fetch`. This runs in the visitor's browser
 * rather than on our server, but a hostile or compromised registry could still
 * point it at the visitor's own network and use them to probe it. Restrict it
 * to plain HTTPS on a public host.
 */
function isSafeRelatedUrl(href: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(href);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:") return false;

  const host = parsed.hostname;
  return !BLOCKED_HOST_PATTERNS.some((pattern) => pattern.test(host));
}

/** The registrar's RDAP server, advertised by the registry as a `related` link. */
function findRelatedLink(json: unknown): string | null {
  if (typeof json !== "object" || json === null) return null;

  const links = (json as { links?: unknown }).links;
  if (!Array.isArray(links)) return null;

  for (const entry of links) {
    if (typeof entry !== "object" || entry === null) continue;
    const link = entry as { rel?: unknown; href?: unknown };
    if (
      link.rel === "related" &&
      typeof link.href === "string" &&
      isSafeRelatedUrl(link.href)
    ) {
      return link.href;
    }
  }
  return null;
}

async function lookupDomain(domain: string): Promise<RdapLookupResult> {
  let service: Awaited<ReturnType<typeof resolveDomainService>>;
  try {
    service = await resolveDomainService(domain);
  } catch (err: unknown) {
    return {
      ok: false,
      reason: "error",
      error:
        err instanceof Error
          ? `Could not load the IANA RDAP bootstrap: ${err.message}`
          : "Could not load the IANA RDAP bootstrap.",
    };
  }

  if (!service) {
    const tld = domain.split(".").pop() ?? domain;
    return {
      ok: false,
      reason: "no-service",
      tld,
      error: `IANA lists no RDAP service for .${tld}. Some registries — including .io, .de and .co — still only offer legacy WHOIS.`,
    };
  }

  const url = `${service.base}domain/${encodeURIComponent(domain)}`;
  const outcome = await fetchRdap(url);

  if (outcome.kind === "not-found") {
    return {
      ok: false,
      reason: "not-found",
      error: `${domain} is not registered, or the registry holds no record for it.`,
    };
  }
  if (outcome.kind === "error") {
    return { ok: false, reason: "error", error: outcome.message };
  }

  const record = parseRdapRecord(outcome.json, url);
  if (!record) {
    return {
      ok: false,
      reason: "error",
      error: "The RDAP server returned a response this tool could not parse.",
    };
  }

  const relatedUrl = findRelatedLink(outcome.json);
  if (!relatedUrl || relatedUrl === url) return { ok: true, data: record };

  // Best effort: plenty of registrar servers 404, rate limit, or omit CORS.
  const related = await fetchRdap(relatedUrl);
  if (related.kind !== "ok") return { ok: true, data: record };

  const registrarRecord = parseRdapRecord(related.json, relatedUrl);
  if (!registrarRecord) return { ok: true, data: record };

  return { ok: true, data: mergeRdapRecords(record, registrarRecord) };
}

async function lookupSimple(
  base: string | null,
  path: string,
  missingMessage: string,
): Promise<RdapLookupResult> {
  if (!base) {
    return { ok: false, reason: "no-service", error: missingMessage };
  }

  const url = `${base}${path}`;
  const outcome = await fetchRdap(url);

  if (outcome.kind === "not-found") {
    return {
      ok: false,
      reason: "not-found",
      error: "No registry record found.",
    };
  }
  if (outcome.kind === "error") {
    return { ok: false, reason: "error", error: outcome.message };
  }

  const record = parseRdapRecord(outcome.json, url);
  if (!record) {
    return {
      ok: false,
      reason: "error",
      error: "The RDAP server returned a response this tool could not parse.",
    };
  }

  return { ok: true, data: record };
}

export async function lookupRdap(
  target: LookupTarget,
): Promise<RdapLookupResult> {
  try {
    if (target.kind === "domain") return await lookupDomain(target.value);

    if (target.kind === "ip") {
      const base = await resolveIpService(target.value);
      return await lookupSimple(
        base,
        `ip/${encodeURIComponent(target.value)}`,
        "No regional internet registry claims this address range.",
      );
    }

    const base = await resolveAsnService(Number(target.value));
    return await lookupSimple(
      base,
      `autnum/${encodeURIComponent(target.value)}`,
      "No regional internet registry claims this AS number.",
    );
  } catch (err: unknown) {
    return {
      ok: false,
      reason: "error",
      error: err instanceof Error ? err.message : "RDAP lookup failed.",
    };
  }
}

export type { RdapRecord };
