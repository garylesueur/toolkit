import { downloadZip } from "client-zip";

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

export function loadImage(
  file: File,
): Promise<{ img: HTMLImageElement; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image."));
    };
    img.src = url;
  });
}

export async function compressSingleFile(
  file: File,
  format: OutputFormat,
  quality: number,
): Promise<{ img: HTMLImageElement; sourceUrl: string; blob: Blob }> {
  const { img, url } = await loadImage(file);
  const blob = await compressImage(
    img,
    img.naturalWidth,
    img.naturalHeight,
    format,
    quality,
  );
  return { img, sourceUrl: url, blob };
}

export async function buildBatchZip(
  items: Array<{ name: string; blob: Blob }>,
): Promise<Blob> {
  const files = items.map(({ name, blob }) => ({ name, input: blob }));
  return downloadZip(files).blob();
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
