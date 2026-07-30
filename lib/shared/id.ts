const SHORT_ID_ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function uuid(): string {
  return crypto.randomUUID();
}

const BYTE_VALUES = 256;

/**
 * Largest multiple of the alphabet that fits in a byte. Bytes at or above this
 * are rejected and redrawn: 256 is not divisible by 62, so a plain `% 62` would
 * make the first four characters ~25% more likely than the rest.
 */
const UNBIASED_LIMIT = BYTE_VALUES - (BYTE_VALUES % SHORT_ID_ALPHABET.length);

export function shortId(length = 12): string {
  let result = "";

  while (result.length < length) {
    const bytes = crypto.getRandomValues(
      new Uint8Array(length - result.length),
    );
    for (const byte of bytes) {
      if (byte >= UNBIASED_LIMIT) continue;
      result += SHORT_ID_ALPHABET[byte % SHORT_ID_ALPHABET.length];
    }
  }

  return result;
}
