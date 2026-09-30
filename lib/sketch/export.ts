import type { Stage } from "konva/lib/Stage";

import { EXPORT_PIXEL_RATIO } from "@/lib/sketch/constants";

/**
 * Rasterise the Konva stage to a PNG blob.
 * Uses `toCanvas` rather than `toBlob` so the return type stays a real `Blob`
 * (Konva types `toBlob` as `Promise<unknown>`).
 */
export async function stageToPngBlob(stage: Stage): Promise<Blob> {
  const canvas = stage.toCanvas({ pixelRatio: EXPORT_PIXEL_RATIO });
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not export the sketch as a PNG."));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
