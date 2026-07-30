import { DNS_RECORD_TYPES } from "./types";
import type { DnsAnswer, DnsLookup, DnsRecord, DnsRecordType } from "./types";

/**
 * DNS-over-HTTPS via Cloudflare's JSON API (RFC 8484 companion format). Both
 * this and dns.google send `Access-Control-Allow-Origin: *`, so the lookup runs
 * straight from the browser with no proxy of ours in the middle.
 */
const RESOLVER_URL = "https://cloudflare-dns.com/dns-query";
const DOH_ACCEPT = "application/dns-json";
const REQUEST_TIMEOUT_MS = 8000;

/** RCODE 3 — the name does not exist anywhere in the DNS. */
const RCODE_NXDOMAIN = 3;

const RCODE_MESSAGES: Record<number, string> = {
  1: "The resolver rejected the query as malformed.",
  2: "The authoritative nameserver failed to answer (SERVFAIL).",
  4: "The resolver does not support this query type.",
  5: "The resolver refused the query.",
};

/** A CNAME answered in place of the requested type. */
const TYPE_CNAME = 5;

type DohAnswer = {
  name?: unknown;
  type?: unknown;
  TTL?: unknown;
  data?: unknown;
};

type DohResponse = {
  Status?: unknown;
  Answer?: unknown;
};

/**
 * Cloudflare returns CAA records in RFC 3597 unknown-record form —
 * `\# 15 00 05 69 73 73 75 65 …` — rather than the presentation format. Decode
 * it to `0 issue "pki.goog"` so the output is readable.
 */
function decodeCaa(data: string): string {
  const match = /^\\#\s+\d+\s+([0-9a-f\s]+)$/i.exec(data.trim());
  if (!match) return data;

  const bytes = match[1]
    .trim()
    .split(/\s+/)
    .map((byte) => Number.parseInt(byte, 16));

  if (bytes.length < 2 || bytes.some(Number.isNaN)) return data;

  const flags = bytes[0];
  const tagLength = bytes[1];
  if (bytes.length < 2 + tagLength) return data;

  const decoder = new TextDecoder();
  const tag = decoder.decode(Uint8Array.from(bytes.slice(2, 2 + tagLength)));
  const value = decoder.decode(Uint8Array.from(bytes.slice(2 + tagLength)));

  return `${flags} ${tag} "${value}"`;
}

/**
 * TXT values arrive quoted, and strings over 255 bytes are split into several
 * quoted chunks that must be concatenated with no separator (RFC 7208 §3.3).
 */
function decodeTxt(data: string): string {
  const chunks = data.match(/"((?:[^"\\]|\\.)*)"/g);
  if (!chunks) return data;

  return chunks
    .map((chunk) =>
      chunk.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\"),
    )
    .join("");
}

function formatValue(
  type: DnsRecordType,
  answerType: number,
  data: string,
): string {
  if (answerType === TYPE_CNAME) return `CNAME → ${data}`;
  if (type === "TXT" && answerType === 16) return decodeTxt(data);
  if (type === "CAA" && answerType === 257) return decodeCaa(data);
  return data;
}

async function queryType(
  name: string,
  type: DnsRecordType,
): Promise<DnsAnswer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const url = `${RESOLVER_URL}?name=${encodeURIComponent(name)}&type=${type}`;

  try {
    const response = await fetch(url, {
      headers: { Accept: DOH_ACCEPT },
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        type,
        records: [],
        error: `Resolver returned ${response.status} ${response.statusText}.`,
        nxdomain: false,
      };
    }

    const payload: DohResponse = await response.json();
    const status = typeof payload.Status === "number" ? payload.Status : 0;

    if (status === RCODE_NXDOMAIN) {
      return { type, records: [], error: null, nxdomain: true };
    }
    if (status !== 0) {
      return {
        type,
        records: [],
        error: RCODE_MESSAGES[status] ?? `Resolver returned status ${status}.`,
        nxdomain: false,
      };
    }

    const answers = Array.isArray(payload.Answer) ? payload.Answer : [];
    const records: DnsRecord[] = [];

    for (const entry of answers as DohAnswer[]) {
      if (typeof entry.data !== "string") continue;
      const answerType = typeof entry.type === "number" ? entry.type : 0;

      records.push({
        name:
          typeof entry.name === "string" ? entry.name.replace(/\.$/, "") : name,
        ttl: typeof entry.TTL === "number" ? entry.TTL : 0,
        value: formatValue(type, answerType, entry.data),
      });
    }

    return { type, records, error: null, nxdomain: false };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      type,
      records: [],
      error: message.toLowerCase().includes("abort")
        ? "The resolver did not respond in time."
        : `Lookup failed: ${message}`,
      nxdomain: false,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function lookupDns(name: string): Promise<DnsLookup> {
  const answers = await Promise.all(
    DNS_RECORD_TYPES.map((type) => queryType(name, type)),
  );

  return {
    answers,
    nxdomain: answers.every((answer) => answer.nxdomain),
  };
}
