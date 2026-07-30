import { randomUUID } from "node:crypto";

import { put } from "@vercel/blob";

/**
 * Generated PDFs are written to Vercel Blob and handed back as a URL. Returning
 * the bytes inline would put ~35k tokens of base64 into the model's context for
 * even a small document.
 */
export const BLOB_PREFIX = "markdown-pdf";

/** Blob has no native TTL; the cleanup cron deletes anything older than this. */
export const BLOB_TTL_HOURS = 24;

export type StoredPdf = {
  url: string;
  pathname: string;
  size: number;
};

function safeFilename(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return slug.length > 0 ? slug : "document";
}

export function isBlobConfigured(): boolean {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  return typeof token === "string" && token.length > 0;
}

export async function storePdf(
  bytes: Uint8Array,
  title: string,
): Promise<StoredPdf> {
  // The random segment is what keeps the URL unguessable — blobs are public.
  const pathname = `${BLOB_PREFIX}/${randomUUID()}/${safeFilename(title)}.pdf`;

  const blob = await put(pathname, Buffer.from(bytes), {
    access: "public",
    contentType: "application/pdf",
    addRandomSuffix: false,
  });

  return { url: blob.url, pathname, size: bytes.length };
}
