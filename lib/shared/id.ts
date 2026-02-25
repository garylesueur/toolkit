const SHORT_ID_ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

export function uuid(): string {
  return crypto.randomUUID()
}

export function shortId(length = 12): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  let result = ""
  for (const byte of bytes) {
    result += SHORT_ID_ALPHABET[byte % SHORT_ID_ALPHABET.length]
  }
  return result
}
