import { PDFDocument } from "pdf-lib";

import { scanFilter, scanOutputSize, scanSourceRect } from "./scan-options.ts";
import type { ScanCrop, ScanRotation } from "./scan-options.ts";

export type ScanSource = {
  contrast: number;
  crop: ScanCrop;
  grayscale: boolean;
  image: HTMLImageElement;
  rotation: ScanRotation;
};

export type ProcessedScan = {
  bytes: Uint8Array;
  height: number;
  width: number;
};

function canvasJpeg(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("The browser could not encode this scan."));
          return;
        }
        blob
          .arrayBuffer()
          .then((buffer) => resolve(new Uint8Array(buffer)))
          .catch(reject);
      },
      "image/jpeg",
      0.9,
    ),
  );
}

export async function processScan(source: ScanSource): Promise<ProcessedScan> {
  const rect = scanSourceRect(
    source.image.naturalWidth,
    source.image.naturalHeight,
    source.crop,
  );
  const size = scanOutputSize(rect.width, rect.height, source.rotation);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create a scan canvas.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, size.width, size.height);
  context.filter = scanFilter(source.grayscale, source.contrast);
  context.translate(size.width / 2, size.height / 2);
  context.rotate((source.rotation * Math.PI) / 180);
  context.drawImage(
    source.image,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    -rect.width / 2,
    -rect.height / 2,
    rect.width,
    rect.height,
  );
  const bytes = await canvasJpeg(canvas);
  canvas.width = 0;
  canvas.height = 0;
  return { bytes, ...size };
}

export async function scansToPdf(
  scans: ProcessedScan[],
  onProgress?: (completed: number, total: number) => void,
): Promise<Uint8Array> {
  if (scans.length === 0) throw new Error("Add at least one scan.");
  const pdf = await PDFDocument.create();
  for (let index = 0; index < scans.length; index++) {
    const scan = scans[index];
    const image = await pdf.embedJpg(scan.bytes);
    const scale = Math.min(1, 14_400 / scan.width, 14_400 / scan.height);
    const width = scan.width * 0.75 * scale;
    const height = scan.height * 0.75 * scale;
    const page = pdf.addPage([width, height]);
    page.drawImage(image, { x: 0, y: 0, width, height });
    onProgress?.(index + 1, scans.length);
  }
  pdf.setProducer("Toolkit — toolkit.lesueur.uk");
  return pdf.save({ useObjectStreams: true });
}
