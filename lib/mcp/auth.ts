import { timingSafeEqual } from "node:crypto";

/**
 * Single seam for MCP authentication. Today it is a shared bearer token; when
 * Better Auth lands, its OAuth check replaces the body of
 * `authenticateMcpRequest` and nothing else in the route has to change.
 */
export type AuthResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

const BEARER_PREFIX = /^Bearer\s+/i;

export function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  // timingSafeEqual throws on length mismatch, which would itself leak length.
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function authenticateMcpRequest(request: Request): AuthResult {
  const expected = process.env.MCP_AUTH_TOKEN;

  if (!expected || expected.length === 0) {
    return {
      ok: false,
      status: 503,
      error:
        "MCP_AUTH_TOKEN is not configured on this deployment, so the MCP endpoint is disabled.",
    };
  }

  const header = request.headers.get("authorization");
  if (!header || !BEARER_PREFIX.test(header)) {
    return { ok: false, status: 401, error: "Missing bearer token." };
  }

  const token = header.replace(BEARER_PREFIX, "").trim();
  if (!constantTimeEquals(token, expected)) {
    return { ok: false, status: 401, error: "Invalid bearer token." };
  }

  return { ok: true };
}
