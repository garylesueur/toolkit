export type HashAlgorithm = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";

export const HASH_ALGORITHMS: HashAlgorithm[] = [
  "SHA-1",
  "SHA-256",
  "SHA-384",
  "SHA-512",
];

export type HashResults = Record<HashAlgorithm, string>;

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const hexParts: string[] = [];
  for (const byte of bytes) {
    hexParts.push(byte.toString(16).padStart(2, "0"));
  }
  return hexParts.join("");
}

/**
 * Computes a single hash digest for the given text using the Web Crypto API.
 */
export async function computeHash(
  algorithm: HashAlgorithm,
  text: string,
): Promise<string> {
  const encoded = new TextEncoder().encode(text);
  const buffer = await crypto.subtle.digest(algorithm, encoded);
  return bufferToHex(buffer);
}

export async function computeHashBytes(
  algorithm: HashAlgorithm,
  bytes: Uint8Array,
): Promise<string> {
  const buffer = await crypto.subtle.digest(algorithm, bytes.slice().buffer);
  return bufferToHex(buffer);
}

export async function hashFile(
  algorithm: HashAlgorithm,
  file: File,
  onProgress?: (bytesRead: number, totalBytes: number) => void,
): Promise<string> {
  const bytes = new Uint8Array(file.size);
  const reader = file.stream().getReader();
  let offset = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes.set(value, offset);
    offset += value.length;
    onProgress?.(offset, file.size);
  }
  return computeHashBytes(algorithm, bytes);
}

export function normalizeChecksum(value: string): string {
  const trimmed = value.trim().toLowerCase();
  const withoutPrefix = trimmed.replace(
    /^sha(?:-?)(?:1|256|384|512)\s*[:=]?\s*/i,
    "",
  );
  return withoutPrefix.match(/^[a-f0-9]+/)?.[0] ?? "";
}

export function checksumLength(algorithm: HashAlgorithm): number {
  return { "SHA-1": 40, "SHA-256": 64, "SHA-384": 96, "SHA-512": 128 }[
    algorithm
  ];
}

export function verifyChecksum(
  actual: string,
  expectedInput: string,
  algorithm: HashAlgorithm,
): "empty" | "invalid" | "match" | "mismatch" {
  if (!expectedInput.trim()) return "empty";
  const expected = normalizeChecksum(expectedInput);
  if (expected.length !== checksumLength(algorithm)) return "invalid";
  return actual.toLowerCase() === expected ? "match" : "mismatch";
}

/**
 * Computes all supported hash digests for the given text in parallel.
 */
export async function computeAllHashes(text: string): Promise<HashResults> {
  const entries = await Promise.all(
    HASH_ALGORITHMS.map(async (alg) => {
      const hash = await computeHash(alg, text);
      return [alg, hash] as const;
    }),
  );
  return Object.fromEntries(entries) as HashResults;
}
