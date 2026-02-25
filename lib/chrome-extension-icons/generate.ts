import { downloadZip } from "client-zip"
import { chromeExtensionIconTargets } from "./sizes"

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
 * Builds the `"icons"` block for a Chrome extension `manifest.json`.
 *
 * Paths are relative to the extension root, assuming icons live in an
 * `icons/` directory.
 */
export function buildManifestIconsSnippet(): string {
  const entries = chromeExtensionIconTargets.map(
    (t) => `    "${t.size}": "icons/${t.filename}"`,
  )
  return `"icons": {\n${entries.join(",\n")}\n}`
}

/**
 * Generates a ZIP containing every required Chrome extension icon size.
 *
 * All PNGs are placed inside an `icons/` directory within the ZIP so they
 * can be extracted directly into an extension project.
 */
export async function generateChromeExtensionIcons(
  source: HTMLImageElement,
): Promise<Blob> {
  const pngEntries = await Promise.all(
    chromeExtensionIconTargets.map(async (target) => ({
      target,
      blob: await resizeImage(source, target.size),
    })),
  )

  const files = [
    ...pngEntries.map((e) => ({
      name: `icons/${e.target.filename}`,
      input: e.blob,
    })),
    {
      name: "README.txt",
      input: new Blob(
        [
          "Chrome Extension Icons\n" +
            "======================\n\n" +
            "Copy the icons/ folder into your extension project, then add\n" +
            "the following to your manifest.json:\n\n" +
            buildManifestIconsSnippet() +
            "\n",
        ],
        { type: "text/plain" },
      ),
    },
  ]

  return downloadZip(files).blob()
}
