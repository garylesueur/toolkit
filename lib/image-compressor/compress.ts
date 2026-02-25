export type OutputFormat = "image/png" | "image/jpeg" | "image/webp";

/**
 * Draws `sourceImage` onto an off-screen canvas at the given dimensions,
 * then exports it as a Blob in the requested format and quality.
 */
export function compressImage(
  sourceImage: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  format: OutputFormat,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Could not obtain a 2D canvas context."));
      return;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(sourceImage, 0, 0, targetWidth, targetHeight);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Canvas export returned null."));
        }
      },
      format,
      quality,
    );
  });
}

const SIZE_UNITS = ["B", "KB", "MB", "GB"] as const;

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  let unitIndex = 0;
  let value = bytes;

  while (value >= 1024 && unitIndex < SIZE_UNITS.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  const formatted = unitIndex === 0 ? value.toString() : value.toFixed(1);
  return `${formatted} ${SIZE_UNITS[unitIndex]}`;
}
