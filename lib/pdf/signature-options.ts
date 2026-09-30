import { watermarkPoint } from "./watermark-options.ts";
import type { WatermarkPosition } from "./watermark-options.ts";

export type SignaturePosition = WatermarkPosition;

export function signaturePageIndex(page: number, totalPages: number): number {
  if (totalPages < 1) throw new Error("The PDF has no pages.");
  if (!Number.isInteger(page) || page < 0 || page >= totalPages) {
    throw new Error(`The signature page must be between 1 and ${totalPages}.`);
  }
  return page;
}

export function fitSignatureSize(
  pageWidth: number,
  pageHeight: number,
  aspectRatio: number,
  widthPercent: number,
  margin: number,
): { width: number; height: number } {
  if (
    !Number.isFinite(aspectRatio) ||
    aspectRatio <= 0 ||
    !Number.isFinite(widthPercent) ||
    widthPercent < 5 ||
    widthPercent > 90 ||
    !Number.isFinite(margin) ||
    margin < 0
  ) {
    throw new Error("Signature size settings are invalid.");
  }
  const availableWidth = Math.max(1, pageWidth - margin * 2);
  const availableHeight = Math.max(1, pageHeight - margin * 2);
  let width = Math.min(pageWidth * (widthPercent / 100), availableWidth);
  let height = width / aspectRatio;
  if (height > availableHeight) {
    height = availableHeight;
    width = height * aspectRatio;
  }
  return { width, height };
}

export function signaturePoint(
  pageWidth: number,
  pageHeight: number,
  width: number,
  height: number,
  margin: number,
  position: SignaturePosition,
): { x: number; y: number } {
  return watermarkPoint(
    pageWidth,
    pageHeight,
    width,
    height,
    0,
    margin,
    position,
  );
}
