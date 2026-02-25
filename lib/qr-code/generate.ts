import QRCode from "qrcode"

export type ErrorCorrectionLevel = "L" | "M" | "Q" | "H"

interface RenderQrOptions {
  errorCorrectionLevel: ErrorCorrectionLevel
  width: number
}

interface GenerateSvgOptions {
  errorCorrectionLevel: ErrorCorrectionLevel
}

export async function renderQrToCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  options: RenderQrOptions,
): Promise<void> {
  await QRCode.toCanvas(canvas, text, {
    errorCorrectionLevel: options.errorCorrectionLevel,
    width: options.width,
    margin: 2,
  })
}

export async function generateQrSvg(
  text: string,
  options: GenerateSvgOptions,
): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    errorCorrectionLevel: options.errorCorrectionLevel,
    margin: 2,
  })
}

export function downloadCanvasAsPng(
  canvas: HTMLCanvasElement,
  filename: string,
): void {
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, "image/png")
}
