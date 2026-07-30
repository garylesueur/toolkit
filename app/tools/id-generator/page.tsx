"use client";

import { RiRefreshLine, RiFileCopyLine, RiCheckLine } from "@remixicon/react";
import { useState, useEffect, useCallback } from "react";

import { PrivacyBanner } from "@/components/privacy-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { shortId } from "@/lib/shared/id";

const NANOID_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

type IdEntry = {
  format: string;
  value: string;
};

/** Generates a NanoID-style string with configurable length (default 21). */
function nanoId(length = 21): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let result = "";
  for (const byte of bytes) {
    result += NANOID_ALPHABET[byte % NANOID_ALPHABET.length];
  }
  return result;
}

const BITS_PER_CHAR = 5;
const CHAR_MASK = BigInt(0b11111);

/**
 * Encodes an integer as exactly `charCount` Crockford Base32 characters.
 *
 * Working from a single integer keeps the value right-aligned in the output.
 * A byte-at-a-time encoder has to do something with the leftover bits when the
 * input is not a multiple of 5 — and appending them shifted *left* silently
 * multiplies the value (a 48-bit timestamp came out 4× too large, dating every
 * ULID to the year 2196).
 */
function encodeCrockfordBase32(value: bigint, charCount: number): string {
  let result = "";
  for (let i = charCount - 1; i >= 0; i -= 1) {
    const shift = BigInt(i * BITS_PER_CHAR);
    result += CROCKFORD_BASE32[Number((value >> shift) & CHAR_MASK)];
  }
  return result;
}

const ULID_TIME_CHARS = 10;
const ULID_RANDOM_BYTES = 10;
const ULID_RANDOM_CHARS = 16;

function bytesToBigInt(bytes: Uint8Array): bigint {
  let value = BigInt(0);
  for (const byte of bytes) value = (value << BigInt(8)) | BigInt(byte);
  return value;
}

/** Generates a ULID: 10 chars timestamp + 16 chars random, Crockford Base32. */
function ulid(): string {
  /**
   * The timestamp is 48 bits, wider than the 32-bit operands JS bitwise
   * operators coerce to — `Date.now() >>> 40` silently shifts by `40 % 32`.
   * BigInt is the only way to handle the full width.
   */
  const timestamp = BigInt(Date.now());
  const randomBytes = crypto.getRandomValues(new Uint8Array(ULID_RANDOM_BYTES));

  return (
    encodeCrockfordBase32(timestamp, ULID_TIME_CHARS) +
    encodeCrockfordBase32(bytesToBigInt(randomBytes), ULID_RANDOM_CHARS)
  );
}

function generateAll(): IdEntry[] {
  return [
    { format: "UUID", value: crypto.randomUUID() },
    { format: "Short ID", value: shortId(12) },
    { format: "NanoID", value: nanoId(21) },
    { format: "ULID", value: ulid() },
  ];
}

const COPY_FEEDBACK_MS = 2000;

export default function IdGeneratorPage() {
  const [ids, setIds] = useState<IdEntry[]>([]);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  const regenerate = useCallback(() => {
    setIds(generateAll());
  }, []);

  useEffect(() => {
    regenerate();
  }, [regenerate]);

  const handleCopy = useCallback(async (entry: IdEntry) => {
    await navigator.clipboard.writeText(entry.value);
    setCopiedFormat(entry.format);
    setTimeout(() => setCopiedFormat(null), COPY_FEEDBACK_MS);
  }, []);

  const handleRowClick = useCallback(
    (entry: IdEntry) => {
      void handleCopy(entry);
    },
    [handleCopy],
  );

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ID Generator</h1>
          <p className="text-muted-foreground mt-1">
            Generate unique identifiers in various formats. Click any value to
            copy it.
          </p>
          <PrivacyBanner>
            Your IDs are generated entirely in your browser. Nothing is stored,
            logged, or sent to a server.
          </PrivacyBanner>
        </div>
        <Button variant="outline" onClick={regenerate}>
          <RiRefreshLine data-icon="inline-start" />
          Regenerate all
        </Button>
      </div>

      <div className="mt-8 space-y-3">
        {ids.map((entry) => {
          const isCopied = copiedFormat === entry.format;
          /*
           * One real <button> for the whole row rather than a role="button"
           * div wrapping a nested copy button — a button may not contain
           * another button, and both fired the same copy action anyway.
           */
          return (
            <button
              key={entry.format}
              type="button"
              onClick={() => handleRowClick(entry)}
              aria-label={isCopied ? "Copied" : `Copy ${entry.format}`}
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Badge variant="secondary">{entry.format}</Badge>
              <code className="min-w-0 flex-1 truncate font-mono text-sm">
                {entry.value}
              </code>
              <span className="text-muted-foreground flex size-8 shrink-0 items-center justify-center">
                {isCopied ? (
                  <RiCheckLine className="size-4 text-green-600 dark:text-green-500" />
                ) : (
                  <RiFileCopyLine className="size-4" />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
