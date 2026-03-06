/**
 * Browser info compression and sharing via URL hash fragments.
 * Uses gzip compression (CompressionStream API) + base64url encoding.
 * All processing runs client-side in the browser.
 */

import type { BrowserInfo } from "./types"

/**
 * Compresses a string using the CompressionStream API (gzip).
 * Falls back to uncompressed if compression is not available.
 */
async function compressString(input: string): Promise<Uint8Array> {
  if (
    typeof CompressionStream !== "undefined" &&
    typeof ReadableStream !== "undefined"
  ) {
    try {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(input))
          controller.close()
        },
      })

      const compressedStream = stream.pipeThrough(
        new CompressionStream("gzip")
      )

      const chunks: Uint8Array[] = []
      const reader = compressedStream.getReader()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) chunks.push(value)
      }

      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
      const result = new Uint8Array(totalLength)
      let offset = 0
      for (const chunk of chunks) {
        result.set(chunk, offset)
        offset += chunk.length
      }

      return result
    } catch {
      // Fall through to uncompressed
    }
  }

  return new TextEncoder().encode(input)
}

/**
 * Decompresses a Uint8Array using the DecompressionStream API.
 * Falls back to treating as plain text if decompression fails.
 */
async function decompressString(compressed: Uint8Array): Promise<string> {
  if (
    typeof DecompressionStream !== "undefined" &&
    typeof ReadableStream !== "undefined"
  ) {
    try {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(compressed)
          controller.close()
        },
      })

      const decompressedStream = stream.pipeThrough(
        new DecompressionStream("gzip")
      )

      const chunks: Uint8Array[] = []
      const reader = decompressedStream.getReader()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) chunks.push(value)
      }

      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
      const result = new Uint8Array(totalLength)
      let offset = 0
      for (const chunk of chunks) {
        result.set(chunk, offset)
        offset += chunk.length
      }

      return new TextDecoder().decode(result)
    } catch {
      // Fall through to uncompressed
    }
  }

  return new TextDecoder().decode(compressed)
}

/**
 * Converts base64 to base64url (URL-safe, no padding).
 */
function base64ToBase64url(base64: string): string {
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

/**
 * Converts base64url back to base64.
 */
function base64urlToBase64(base64url: string): string {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/")
  while (base64.length % 4) {
    base64 += "="
  }
  return base64
}

/**
 * Strips WebGL extensions array to reduce payload size.
 * Replaces the array with a count string to keep the info useful.
 */
function stripWebGLExtensions(info: BrowserInfo): BrowserInfo {
  const stripped = JSON.parse(JSON.stringify(info)) as BrowserInfo
  if (stripped.hardware.gpu?.extensions) {
    const count = stripped.hardware.gpu.extensions.length
    stripped.hardware.gpu.extensions = [`${count} extensions`]
  }
  return stripped
}

/**
 * Compresses BrowserInfo to a base64url string.
 * Format: "v1:" prefix indicates compressed, no prefix = legacy uncompressed.
 */
export async function compressBrowserInfo(
  info: BrowserInfo
): Promise<string> {
  try {
    // Strip WebGL extensions to reduce size
    const stripped = stripWebGLExtensions(info)
    const json = JSON.stringify(stripped)
    const compressed = await compressString(json)

    // Convert to base64url
    let binary = ""
    for (const byte of compressed) {
      binary += String.fromCharCode(byte)
    }
    const base64 = btoa(binary)
    const base64url = base64ToBase64url(base64)

    // Prefix with version to indicate compression
    return `v1:${base64url}`
  } catch (error) {
    throw new Error(`Failed to compress browser info: ${error}`)
  }
}

/**
 * Decompresses a base64url string back to BrowserInfo.
 * Handles both compressed (v1:) and legacy uncompressed formats.
 */
export async function decompressBrowserInfo(
  encoded: string
): Promise<BrowserInfo> {
  try {
    let base64url: string
    let isCompressed = false

    if (encoded.startsWith("v1:")) {
      base64url = encoded.slice(3)
      isCompressed = true
    } else {
      base64url = encoded
      isCompressed = false
    }

    const base64 = base64urlToBase64(base64url)
    const binary = atob(base64)

    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }

    let json: string
    if (isCompressed) {
      json = await decompressString(bytes)
    } else {
      json = new TextDecoder().decode(bytes)
    }

    const info = JSON.parse(json) as BrowserInfo
    if (!("decoded" in info) || info.decoded === undefined) {
      info.decoded = null
    }
    return info
  } catch (error) {
    throw new Error(`Failed to decompress browser info: ${error}`)
  }
}

/**
 * Creates a shareable URL with the browser info compressed in the hash.
 */
export async function createShareableUrl(
  baseUrl: string,
  info: BrowserInfo
): Promise<string> {
  const compressed = await compressBrowserInfo(info)
  return `${baseUrl}#data=${compressed}`
}

/**
 * Extracts and decompresses browser info from a URL hash fragment.
 */
export async function extractSharedInfoFromHash(): Promise<BrowserInfo | null> {
  if (typeof window === "undefined") return null

  try {
    const hash = window.location.hash
    const match = hash.match(/^#data=(.+)$/)
    if (!match) return null

    const encoded = match[1]
    return await decompressBrowserInfo(encoded)
  } catch {
    return null
  }
}
