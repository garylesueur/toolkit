export interface PlaceholderOptions {
  width: number;
  height: number;
  backgroundColor: string;
  textColor: string;
  text: string;
  fontSize: number;
}

/**
 * Browsers cap both the longest edge and the total area of a canvas. Past those
 * limits `getContext` and `toBlob` quietly hand back `null`, so an unbounded
 * size produces a blank preview and a Download button that does nothing at all.
 * Safari has the tightest ceiling of the major engines, so match it.
 */
export const MAX_DIMENSION = 4096;

export function isSupportedSize(width: number, height: number): boolean {
  return (
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    width > 0 &&
    height > 0 &&
    width <= MAX_DIMENSION &&
    height <= MAX_DIMENSION
  );
}

export function renderPlaceholder(
  canvas: HTMLCanvasElement,
  options: PlaceholderOptions,
): void {
  const { width, height, backgroundColor, textColor, text, fontSize } = options;
  if (!isSupportedSize(width, height)) return;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = textColor;
  ctx.font = `${fontSize}px -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, height / 2);
}

export function getPlaceholderDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png");
}

/** Rejects rather than failing silently, so callers can surface the reason. */
export function downloadPlaceholderPng(
  canvas: HTMLCanvasElement,
  filename: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("The image is too large for this browser to render."));
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      resolve();
    }, "image/png");
  });
}
