import { del, list } from "@vercel/blob";

import { constantTimeEquals } from "@/lib/mcp/auth";
import {
  BLOB_PREFIX,
  BLOB_TTL_HOURS,
  isBlobConfigured,
} from "@/lib/mcp/storage";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Vercel Blob has no object expiry, so MCP-generated PDFs are swept here.
 * Scheduled by the `crons` entry in `vercel.json`; Vercel signs those requests
 * with `CRON_SECRET`, which is what keeps this from being publicly runnable.
 */
function isAuthorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization");
  if (!header) return false;

  // Same constant-time comparison the MCP route uses — a plain `===` on a
  // secret leaks its prefix through timing.
  return constantTimeEquals(header, `Bearer ${secret}`);
}

export async function GET(request: Request): Promise<Response> {
  if (!isAuthorised(request)) {
    return Response.json(
      { ok: false, error: "Unauthorised." },
      { status: 401 },
    );
  }
  if (!isBlobConfigured()) {
    return Response.json(
      { ok: false, error: "BLOB_READ_WRITE_TOKEN is not configured." },
      { status: 503 },
    );
  }

  const cutoff = Date.now() - BLOB_TTL_HOURS * MS_PER_HOUR;
  const expired: string[] = [];
  let cursor: string | undefined;

  do {
    const page = await list({ prefix: `${BLOB_PREFIX}/`, cursor, limit: 1000 });
    for (const blob of page.blobs) {
      if (blob.uploadedAt.getTime() < cutoff) expired.push(blob.url);
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  if (expired.length > 0) await del(expired);

  return Response.json({ ok: true, deleted: expired.length });
}
