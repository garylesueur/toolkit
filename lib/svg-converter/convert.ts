type OutputFormat = "image/png" | "image/jpeg"

type ConvertSvgOptions = {
  svgSource: string
  width: number
  height: number
  format: OutputFormat
  /** JPEG quality between 0 and 1. Ignored for PNG. */
  quality: number
}

/**
 * Rasterises an SVG string to a PNG or JPEG blob by drawing it onto a canvas.
 *
 * The SVG is loaded into an `Image` element via an object URL, drawn at the
 * requested dimensions, then exported with `canvas.toBlob()`.
 */
export function convertSvgToRaster(options: ConvertSvgOptions): Promise<Blob> {
  const { svgSource, width, height, format, quality } = options

  return new Promise<Blob>((resolve, reject) => {
    const svgBlob = new Blob([svgSource], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(svgBlob)

    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(url)

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Failed to get canvas 2D context."))
        return
      }

      if (format === "image/jpeg") {
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, width, height)
      }

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "high"
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas export returned null."))
            return
          }
          resolve(blob)
        },
        format,
        format === "image/jpeg" ? quality : undefined,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Failed to load SVG into an image element."))
    }

    img.src = url
  })
}
