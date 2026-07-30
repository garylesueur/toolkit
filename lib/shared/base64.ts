/**
 * Base64 helpers that are correct for the full Unicode range.
 *
 * `btoa`/`atob` only speak Latin-1: one code unit per byte. Passing them a
 * JS string directly mangles anything outside U+0000–U+00FF, and the classic
 * `escape`/`unescape` workaround throws a `URIError` on lone surrogates. Going
 * through `TextEncoder`/`TextDecoder` avoids both — a lone surrogate encodes to
 * U+FFFD rather than blowing up.
 */
const BASE64_PADDING = 4;

function bytesToBinary(bytes: Uint8Array): string {
  // Built one character at a time: `String.fromCharCode(...bytes)` overflows the
  // call stack once the input is a few hundred kilobytes.
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return binary;
}

export function encodeUtf8ToBase64(input: string): string {
  return btoa(bytesToBinary(new TextEncoder().encode(input)));
}

/** Throws if `input` is not valid base64. */
export function decodeBase64ToUtf8(input: string): string {
  const binary = atob(input);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Base64url replaces `+`/`/` with `-`/`_` and omits padding. */
export function decodeBase64UrlToUtf8(segment: string): string {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length +
      ((BASE64_PADDING - (base64.length % BASE64_PADDING)) % BASE64_PADDING),
    "=",
  );
  return decodeBase64ToUtf8(padded);
}
