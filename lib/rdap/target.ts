import type { LookupTarget } from "./types";

const ASN_PATTERN = /^(?:as)?(\d{1,10})$/i;
const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const DOMAIN_PATTERN =
  /^[a-z0-9¡-￿]([a-z0-9¡-￿-]*[a-z0-9¡-￿])?(\.[a-z0-9¡-￿]([a-z0-9¡-￿-]*[a-z0-9¡-￿])?)+$/i;

const MAX_OCTET = 255;
const MAX_ASN = 4294967295;

function isIpv4(value: string): boolean {
  const match = IPV4_PATTERN.exec(value);
  if (!match) return false;
  return match.slice(1, 5).every((octet) => Number(octet) <= MAX_OCTET);
}

function isIpv6(value: string): boolean {
  // Cheap structural check — the registries reject anything genuinely malformed.
  if (!value.includes(":")) return false;
  return /^[0-9a-f:.]+$/i.test(value) && (value.match(/:/g)?.length ?? 0) >= 2;
}

/**
 * Converts a unicode domain to its punycode (A-label) form, which is what RDAP
 * servers expect. `URL` does the IDNA work for us — no punycode dependency.
 */
function toAsciiDomain(domain: string): string {
  try {
    return new URL(`https://${domain}`).hostname;
  } catch {
    return domain;
  }
}

/**
 * Accepts whatever the user pastes — a URL, a domain with `www.`, a bare IP, or
 * an AS number — and works out what kind of lookup it implies.
 */
export function parseLookupInput(input: string): LookupTarget | null {
  let value = input.trim();
  if (value.length === 0) return null;

  const asnMatch = ASN_PATTERN.exec(value);
  if (asnMatch) {
    const asn = Number(asnMatch[1]);
    return asn <= MAX_ASN ? { kind: "autnum", value: String(asn) } : null;
  }

  // Strip a scheme and anything after the authority, so a pasted URL just works.
  if (value.includes("://")) {
    try {
      value = new URL(value).hostname;
    } catch {
      return null;
    }
  } else {
    value = value.split("/")[0] ?? value;
    value = value.split("?")[0] ?? value;
  }

  // A bracketed IPv6 literal from a URL, e.g. [2001:db8::1].
  if (value.startsWith("[") && value.endsWith("]")) {
    value = value.slice(1, -1);
  }

  if (isIpv6(value)) return { kind: "ip", value: value.toLowerCase() };

  // Port suffix, but only once IPv6 is ruled out — colons are meaningful there.
  value = value.split(":")[0] ?? value;

  if (isIpv4(value)) return { kind: "ip", value };

  value = value.replace(/\.$/, "").toLowerCase();
  if (value.startsWith("www.")) value = value.slice(4);

  if (!DOMAIN_PATTERN.test(value)) return null;

  return { kind: "domain", value: toAsciiDomain(value) };
}
