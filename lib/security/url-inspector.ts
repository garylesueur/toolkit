export type UrlFinding = {
  code: string;
  message: string;
  severity: "high" | "medium" | "info";
};

export type UrlInspection = {
  findings: UrlFinding[];
  hostname: string;
  inferredScheme: boolean;
  normalizedUrl: string;
  passwordPresent: boolean;
  pathname: string;
  port: string;
  protocol: string;
  query: Array<{ name: string; value: string }>;
  riskLevel: "No obvious structural warnings" | "Caution" | "High caution";
  username: string;
};

function isIpAddress(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, "");
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || host.includes(":");
}

function isLocalHost(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (
    host.startsWith("127.") ||
    host.startsWith("10.") ||
    host.startsWith("192.168.")
  )
    return true;
  const match = host.match(/^172\.(\d{1,3})\./);
  return !!match && Number(match[1]) >= 16 && Number(match[1]) <= 31;
}

function hasMixedScripts(value: string) {
  const hasLatin = /\p{Script=Latin}/u.test(value);
  const hasCyrillic = /\p{Script=Cyrillic}/u.test(value);
  const hasGreek = /\p{Script=Greek}/u.test(value);
  return [hasLatin, hasCyrillic, hasGreek].filter(Boolean).length > 1;
}

function decodedTwice(value: string) {
  let decoded = value;
  for (let index = 0; index < 2; index++) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return decoded;
}

export function inspectUrl(rawInput: string): UrlInspection {
  const raw = rawInput.trim();
  if (!raw) throw new Error("Enter a URL to inspect.");
  const inferredScheme = !/^[a-z][a-z0-9+.-]*:/i.test(raw);
  let url: URL;
  try {
    url = new URL(inferredScheme ? `https://${raw}` : raw);
  } catch {
    throw new Error("That is not a valid URL.");
  }
  const findings: UrlFinding[] = [];
  const add = (
    code: string,
    severity: UrlFinding["severity"],
    message: string,
  ) => findings.push({ code, message, severity });

  if (!["http:", "https:"].includes(url.protocol)) {
    add(
      "scheme",
      "high",
      `The ${url.protocol} scheme is not a normal web link and may trigger another application or execute local browser behaviour.`,
    );
  } else if (url.protocol === "http:") {
    add(
      "http",
      "medium",
      "The link uses unencrypted HTTP, so traffic can be observed or modified in transit.",
    );
  }
  if (url.username || url.password) {
    add(
      "credentials",
      "high",
      "The URL contains embedded credentials before the hostname; this can disguise the real destination.",
    );
  }
  if (url.hostname.includes("xn--")) {
    add(
      "punycode",
      "medium",
      "The hostname contains an internationalised (punycode) label. It may be legitimate, but check it for lookalike characters.",
    );
  }
  const rawAuthority =
    raw.match(/^(?:[a-z][a-z0-9+.-]*:\/\/)?([^/?#]+)/i)?.[1] ?? "";
  if (hasMixedScripts(rawAuthority)) {
    add(
      "mixed-scripts",
      "high",
      "The visible hostname mixes Latin, Cyrillic, or Greek characters, a common lookalike technique.",
    );
  }
  if (isIpAddress(url.hostname)) {
    add(
      "ip-host",
      "medium",
      "The destination uses an IP address instead of a domain name, which makes identity harder to judge.",
    );
  }
  if (isLocalHost(url.hostname)) {
    add(
      "local-host",
      "medium",
      "The destination is local or on a private network, not a public website.",
    );
  }
  if (
    url.port &&
    !(
      (url.protocol === "http:" && url.port === "80") ||
      (url.protocol === "https:" && url.port === "443")
    )
  ) {
    add("port", "medium", `The link uses non-standard port ${url.port}.`);
  }
  if (url.hostname.split(".").length > 5) {
    add(
      "subdomains",
      "medium",
      "The hostname has many subdomains; read it from right to left to identify the registrable destination.",
    );
  }
  if (raw.includes("\\")) {
    add(
      "backslashes",
      "medium",
      "The input contains backslashes, which browsers may normalise in surprising ways.",
    );
  }
  if (/\s/.test(raw)) {
    add(
      "whitespace",
      "medium",
      "The input contains whitespace that may obscure or break the destination.",
    );
  }
  const query = [...url.searchParams].map(([name, value]) => ({ name, value }));
  if (
    query.some(({ value }) => /(?:https?:)?\/\//i.test(decodedTwice(value)))
  ) {
    add(
      "nested-url",
      "medium",
      "A query parameter contains another URL, which may be used as a redirect destination.",
    );
  }
  if (raw.length > 2_000) {
    add(
      "long-url",
      "medium",
      "The URL is unusually long, which can hide important parts of the destination.",
    );
  }
  if (inferredScheme) {
    add(
      "inferred-scheme",
      "info",
      "No scheme was supplied, so HTTPS was assumed for parsing.",
    );
  }

  const riskLevel = findings.some((finding) => finding.severity === "high")
    ? "High caution"
    : findings.some((finding) => finding.severity === "medium")
      ? "Caution"
      : "No obvious structural warnings";
  return {
    findings,
    hostname: url.hostname,
    inferredScheme,
    normalizedUrl: url.href,
    passwordPresent: !!url.password,
    pathname: url.pathname,
    port: url.port,
    protocol: url.protocol,
    query,
    riskLevel,
    username: url.username,
  };
}
