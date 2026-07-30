import type { IpScope, IpVersion } from "./types";

const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const MAX_OCTET = 255;

/** IPv6 forms that wrap an IPv4 address, e.g. `::ffff:203.0.113.1`. */
const IPV4_MAPPED_PREFIX = /^::ffff:/i;

export function detectVersion(ip: string): IpVersion {
  if (IPV4_PATTERN.test(ip)) return "ipv4";
  if (ip.includes(":")) return "ipv6";
  return "unknown";
}

function parseOctets(ip: string): number[] | null {
  const match = IPV4_PATTERN.exec(ip);
  if (!match) return null;

  const octets = match.slice(1, 5).map(Number);
  for (const octet of octets) {
    if (octet > MAX_OCTET) return null;
  }
  return octets;
}

function classifyIpv4(ip: string): IpScope {
  const octets = parseOctets(ip);
  if (!octets) return "unknown";

  const [a, b] = octets;

  if (a === 127) return "loopback";
  if (a === 10) return "private";
  if (a === 172 && b >= 16 && b <= 31) return "private";
  if (a === 192 && b === 168) return "private";
  if (a === 100 && b >= 64 && b <= 127) return "cgnat";
  if (a === 169 && b === 254) return "link-local";
  if (a >= 224 && a <= 239) return "multicast";
  if (a === 0 || a >= 240) return "reserved";

  return "public";
}

function classifyIpv6(ip: string): IpScope {
  const lower = ip.toLowerCase();

  if (IPV4_MAPPED_PREFIX.test(lower)) {
    return classifyIpv4(lower.replace(IPV4_MAPPED_PREFIX, ""));
  }

  if (lower === "::1") return "loopback";
  if (lower === "::") return "reserved";
  if (lower.startsWith("fe80")) return "link-local";
  if (lower.startsWith("ff")) return "multicast";
  // fc00::/7 — unique local addresses, the IPv6 equivalent of RFC 1918 space.
  if (lower.startsWith("fc") || lower.startsWith("fd")) return "private";

  return "public";
}

export function classifyScope(ip: string): IpScope {
  const version = detectVersion(ip);
  if (version === "ipv4") return classifyIpv4(ip);
  if (version === "ipv6") return classifyIpv6(ip);
  return "unknown";
}

const SCOPE_LABELS: Record<IpScope, string> = {
  "public": "Public — routable on the internet",
  "loopback": "Loopback — this machine only",
  "private": "Private — RFC 1918 / unique local, not routable on the internet",
  "cgnat": "Carrier-grade NAT — shared address space (RFC 6598)",
  "link-local": "Link-local — only valid on the local network segment",
  "multicast": "Multicast",
  "reserved": "Reserved — not usable as a host address",
  "unknown": "Unknown",
};

export function describeScope(scope: IpScope): string {
  return SCOPE_LABELS[scope];
}

const VERSION_LABELS: Record<IpVersion, string> = {
  ipv4: "IPv4",
  ipv6: "IPv6",
  unknown: "Unknown",
};

export function describeVersion(version: IpVersion): string {
  return VERSION_LABELS[version];
}

/** Unwraps `::ffff:1.2.3.4` so the underlying IPv4 address is shown plainly. */
export function unwrapIpv4Mapped(ip: string): string | null {
  const lower = ip.toLowerCase();
  if (!IPV4_MAPPED_PREFIX.test(lower)) return null;

  const candidate = lower.replace(IPV4_MAPPED_PREFIX, "");
  return parseOctets(candidate) ? candidate : null;
}
