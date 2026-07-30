/**
 * IANA publishes, per registry type, a mapping of keys (TLDs, IP ranges, ASN
 * ranges) to the RDAP base URLs that are authoritative for them.
 *
 * We resolve this ourselves and query the registry directly rather than going
 * through the rdap.org redirector: that service is aggressively rate limited,
 * and its 429 responses carry no CORS headers, which surfaces in the browser as
 * an unhelpful opaque network failure.
 */
const BOOTSTRAP_URLS = {
  dns: "https://data.iana.org/rdap/dns.json",
  ipv4: "https://data.iana.org/rdap/ipv4.json",
  ipv6: "https://data.iana.org/rdap/ipv6.json",
  asn: "https://data.iana.org/rdap/asn.json",
} as const;

export type BootstrapRegistry = keyof typeof BOOTSTRAP_URLS;

type BootstrapFile = {
  /** Each service is `[[key, …], [rdapBaseUrl, …]]`. */
  services: Array<[string[], string[]]>;
  publication?: string;
};

const cache = new Map<BootstrapRegistry, Promise<BootstrapFile>>();

function loadBootstrap(registry: BootstrapRegistry): Promise<BootstrapFile> {
  const cached = cache.get(registry);
  if (cached) return cached;

  const request = fetch(BOOTSTRAP_URLS[registry], { cache: "force-cache" })
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `IANA bootstrap for ${registry} returned ${response.status}`,
        );
      }
      return response.json() as Promise<BootstrapFile>;
    })
    .catch((err: unknown) => {
      // Don't poison the cache — a transient failure should be retryable.
      cache.delete(registry);
      throw err;
    });

  cache.set(registry, request);
  return request;
}

function normaliseBase(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

/**
 * Finds the RDAP base URL for a domain by matching the longest label suffix.
 * `bbc.co.uk` has no `co.uk` service, so it falls through to the `uk` entry.
 */
export async function resolveDomainService(
  domain: string,
): Promise<{ base: string; tld: string } | null> {
  const file = await loadBootstrap("dns");

  const services = new Map<string, string>();
  for (const [keys, urls] of file.services) {
    const base = urls[0];
    if (!base) continue;
    for (const key of keys) services.set(key.toLowerCase(), base);
  }

  const labels = domain.toLowerCase().split(".");
  for (let i = 1; i < labels.length; i += 1) {
    const suffix = labels.slice(i).join(".");
    const base = services.get(suffix);
    if (base) return { base: normaliseBase(base), tld: suffix };
  }

  return null;
}

/** Turns an IPv4 dotted quad into its unsigned 32-bit value. */
function ipv4ToNumber(ip: string): number | null {
  const octets = ip.split(".");
  if (octets.length !== 4) return null;

  let value = 0;
  for (const octet of octets) {
    const parsed = Number(octet);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 255) return null;
    value = value * 256 + parsed;
  }
  return value;
}

function ipv4InCidr(ip: string, cidr: string): boolean {
  const [network, prefixText] = cidr.split("/");
  const prefix = Number(prefixText);
  const target = ipv4ToNumber(ip);
  const base = ipv4ToNumber(network ?? "");

  if (target === null || base === null || !Number.isInteger(prefix))
    return false;
  if (prefix === 0) return true;

  const mask = (0xffffffff << (32 - prefix)) >>> 0;
  return (target & mask) >>> 0 === (base & mask) >>> 0;
}

/** Expands an IPv6 address to its eight 16-bit groups. */
function expandIpv6(ip: string): number[] | null {
  const withoutZone = ip.split("%")[0] ?? ip;
  const [head, tail] = withoutZone.split("::");

  const parseGroups = (part: string | undefined): number[] => {
    if (!part) return [];
    return part
      .split(":")
      .filter((group) => group.length > 0)
      .map((group) => Number.parseInt(group, 16));
  };

  const headGroups = parseGroups(head);
  const tailGroups = parseGroups(tail);

  const groups =
    tail === undefined
      ? headGroups
      : [
          ...headGroups,
          ...Array.from<number>({
            length: 8 - headGroups.length - tailGroups.length,
          }).fill(0),
          ...tailGroups,
        ];

  if (groups.length !== 8 || groups.some((group) => Number.isNaN(group))) {
    return null;
  }
  return groups;
}

function ipv6InCidr(ip: string, cidr: string): boolean {
  const [network, prefixText] = cidr.split("/");
  const prefix = Number(prefixText);
  const target = expandIpv6(ip);
  const base = expandIpv6(network ?? "");

  if (!target || !base || !Number.isInteger(prefix)) return false;

  let remaining = prefix;
  for (let i = 0; i < 8 && remaining > 0; i += 1) {
    const bits = Math.min(16, remaining);
    const mask = bits === 0 ? 0 : (0xffff << (16 - bits)) & 0xffff;
    if ((target[i] & mask) !== (base[i] & mask)) return false;
    remaining -= bits;
  }
  return true;
}

export async function resolveIpService(ip: string): Promise<string | null> {
  const isIpv6 = ip.includes(":");
  const file = await loadBootstrap(isIpv6 ? "ipv6" : "ipv4");

  for (const [ranges, urls] of file.services) {
    const base = urls[0];
    if (!base) continue;

    for (const range of ranges) {
      const cidr = range.includes("/")
        ? range
        : `${range}${isIpv6 ? "/16" : "/8"}`;
      const matches = isIpv6 ? ipv6InCidr(ip, cidr) : ipv4InCidr(ip, cidr);
      if (matches) return normaliseBase(base);
    }
  }

  return null;
}

export async function resolveAsnService(asn: number): Promise<string | null> {
  const file = await loadBootstrap("asn");

  for (const [ranges, urls] of file.services) {
    const base = urls[0];
    if (!base) continue;

    for (const range of ranges) {
      const [startText, endText] = range.split("-");
      const start = Number(startText);
      const end = endText === undefined ? start : Number(endText);
      if (Number.isInteger(start) && asn >= start && asn <= end) {
        return normaliseBase(base);
      }
    }
  }

  return null;
}
