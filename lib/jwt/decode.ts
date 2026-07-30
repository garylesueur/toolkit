import { decodeBase64UrlToUtf8 } from "@/lib/shared/base64";

export interface DecodedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
}

export type JwtDecodeResult =
  | { decoded: DecodedJwt; error: null }
  | { decoded: null; error: string };

function parseSegment(segment: string, label: string): Record<string, unknown> {
  try {
    const json = decodeBase64UrlToUtf8(segment);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    throw new Error(`Failed to decode JWT ${label}`);
  }
}

export function decodeJwt(token: string): JwtDecodeResult {
  const trimmed = token.trim();
  if (!trimmed) {
    return { decoded: null, error: "" };
  }

  const parts = trimmed.split(".");
  if (parts.length !== 3) {
    return {
      decoded: null,
      error: "Invalid JWT — expected three dot-separated segments.",
    };
  }

  try {
    const header = parseSegment(parts[0], "header");
    const payload = parseSegment(parts[1], "payload");
    return { decoded: { header, payload }, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid JWT";
    return { decoded: null, error: message };
  }
}

/**
 * Checks whether a JWT payload's `exp` claim indicates the token is expired.
 * Returns `null` if there is no `exp` claim.
 */
export function isTokenExpired(
  payload: Record<string, unknown>,
): boolean | null {
  const exp = payload.exp;
  if (typeof exp !== "number") return null;
  return Date.now() >= exp * 1000;
}

/**
 * Formats a Unix timestamp (seconds) to a human-readable local date/time string.
 */
export function formatExpiry(exp: number): string {
  return new Date(exp * 1000).toLocaleString();
}
