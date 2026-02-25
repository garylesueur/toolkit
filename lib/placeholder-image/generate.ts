export interface PlaceholderOptions {
  width: number
  height: number
  backgroundColor: string
  textColor: string
  text: string
  fontSize: number
}

export function renderPlaceholder(
  canvas: HTMLCanvasElement,
  options: PlaceholderOptions,
): void {
  const { width, height, backgroundColor, textColor, text, fontSize } = options

  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext("2d")
  if (!ctx) return

  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = textColor
  ctx.font = `${fontSize}px -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(text, width / 2, height / 2)
}

export function getPlaceholderDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png")
}

export function downloadPlaceholderPng(
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
