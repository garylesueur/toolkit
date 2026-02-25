export type HashAlgorithm = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512"

export const HASH_ALGORITHMS: HashAlgorithm[] = [
  "SHA-1",
  "SHA-256",
  "SHA-384",
  "SHA-512",
]

export type HashResults = Record<HashAlgorithm, string>

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const hexParts: string[] = []
  for (const byte of bytes) {
    hexParts.push(byte.toString(16).padStart(2, "0"))
  }
  return hexParts.join("")
}

/**
 * Computes a single hash digest for the given text using the Web Crypto API.
 */
export async function computeHash(
  algorithm: HashAlgorithm,
  text: string,
): Promise<string> {
  const encoded = new TextEncoder().encode(text)
  const buffer = await crypto.subtle.digest(algorithm, encoded)
  return bufferToHex(buffer)
}

/**
 * Computes all supported hash digests for the given text in parallel.
 */
export async function computeAllHashes(text: string): Promise<HashResults> {
  const entries = await Promise.all(
    HASH_ALGORITHMS.map(async (alg) => {
      const hash = await computeHash(alg, text)
      return [alg, hash] as const
    }),
  )
  return Object.fromEntries(entries) as HashResults
}
