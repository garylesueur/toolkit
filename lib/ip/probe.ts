/**
 * Dual-stack detection. Our own origin resolves to whichever family the browser
 * prefers, so it can never tell you what the *other* one is. These two hostnames
 * are pinned to a single family, which makes a failed request the answer rather
 * than an error: no IPv6 route means the v6 probe simply never connects.
 */
const IPV4_PROBE_URL = "https://api4.ipify.org?format=json";
const IPV6_PROBE_URL = "https://api6.ipify.org?format=json";

const PROBE_TIMEOUT_MS = 5000;

type IpifyResponse = {
  ip?: unknown;
};

async function probe(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return null;

    const payload: IpifyResponse = await response.json();
    return typeof payload.ip === "string" && payload.ip.length > 0
      ? payload.ip
      : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function probeIpv4(): Promise<string | null> {
  return probe(IPV4_PROBE_URL);
}

export function probeIpv6(): Promise<string | null> {
  return probe(IPV6_PROBE_URL);
}
