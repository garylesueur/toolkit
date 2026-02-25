import { downloadZip } from "client-zip"
import { faviconTargets } from "./sizes"

function resizeImage(source: HTMLImageElement, size: number): Promise<Blob> {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext("2d")!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"

  const srcW = source.naturalWidth
  const srcH = source.naturalHeight
  const scale = size / Math.max(srcW, srcH)
  const drawW = Math.round(srcW * scale)
  const drawH = Math.round(srcH * scale)
  const offsetX = Math.round((size - drawW) / 2)
  const offsetY = Math.round((size - drawH) / 2)

  ctx.drawImage(source, offsetX, offsetY, drawW, drawH)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas export failed"))),
      "image/png",
    )
  })
}

/**
 * Encodes a multi-resolution ICO file from PNG blobs.
 *
 * ICO layout:
 *   ICONDIR header (6 bytes)
 *   ICONDIRENTRY × n (16 bytes each)
 *   PNG payloads (concatenated)
 */
async function buildIco(
  entries: { size: number; blob: Blob }[],
): Promise<Blob> {
  const payloads = await Promise.all(
    entries.map((e) => e.blob.arrayBuffer()),
  )

  const headerSize = 6
  const dirEntrySize = 16
  const dirSize = dirEntrySize * entries.length
  let dataOffset = headerSize + dirSize

  const totalSize =
    headerSize +
    dirSize +
    payloads.reduce((sum, buf) => sum + buf.byteLength, 0)

  const buffer = new ArrayBuffer(totalSize)
  const view = new DataView(buffer)

  // ICONDIR header
  view.setUint16(0, 0, true) // reserved
  view.setUint16(2, 1, true) // type: 1 = ICO
  view.setUint16(4, entries.length, true) // image count

  for (let i = 0; i < entries.length; i++) {
    const offset = headerSize + i * dirEntrySize
    const size = entries[i].size
    const payloadLen = payloads[i].byteLength

    // ICO spec: 0 means 256
    view.setUint8(offset, size >= 256 ? 0 : size) // width
    view.setUint8(offset + 1, size >= 256 ? 0 : size) // height
    view.setUint8(offset + 2, 0) // colour palette count
    view.setUint8(offset + 3, 0) // reserved
    view.setUint16(offset + 4, 1, true) // colour planes
    view.setUint16(offset + 6, 32, true) // bits per pixel
    view.setUint32(offset + 8, payloadLen, true) // image data size
    view.setUint32(offset + 12, dataOffset, true) // image data offset

    new Uint8Array(buffer, dataOffset, payloadLen).set(
      new Uint8Array(payloads[i]),
    )
    dataOffset += payloadLen
  }

  return new Blob([buffer], { type: "image/x-icon" })
}

function buildManifest(): string {
  const icons = faviconTargets
    .filter((t) => t.purpose)
    .map((t) => ({
      src: `/${t.filename}`,
      sizes: `${t.size}x${t.size}`,
      type: "image/png",
      purpose: t.purpose,
    }))

  return JSON.stringify({ name: "", short_name: "", icons }, null, 2)
}

function buildHeadSnippet(): string {
  return `<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">`
}

export async function generateFavicons(
  source: HTMLImageElement,
): Promise<Blob> {
  const pngEntries = await Promise.all(
    faviconTargets.map(async (target) => ({
      target,
      blob: await resizeImage(source, target.size),
    })),
  )

  const icoBlob = await buildIco(
    pngEntries
      .filter((e) => e.target.includeInIco)
      .map((e) => ({ size: e.target.size, blob: e.blob })),
  )

  const files = [
    { name: "favicon.ico", input: icoBlob },
    ...pngEntries.map((e) => ({ name: e.target.filename, input: e.blob })),
    {
      name: "site.webmanifest",
      input: new Blob([buildManifest()], { type: "application/json" }),
    },
    {
      name: "README.txt",
      input: new Blob(
        [
          "Add the following to your <head>:\n\n" +
            buildHeadSnippet() +
            "\n\nPlace all other files in your public / root directory.\n",
        ],
        { type: "text/plain" },
      ),
    },
  ]

  return downloadZip(files).blob()
}

export { buildHeadSnippet }
