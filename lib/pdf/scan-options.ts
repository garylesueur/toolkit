export type ScanCrop = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};
export type ScanRotation = 0 | 90 | 180 | 270;

export function normaliseScanCrop(crop: ScanCrop): ScanCrop {
  const clamp = (value: number) =>
    Math.min(90, Math.max(0, Number.isFinite(value) ? value : 0));
  const normalised = {
    top: clamp(crop.top),
    right: clamp(crop.right),
    bottom: clamp(crop.bottom),
    left: clamp(crop.left),
  };
  if (
    normalised.left + normalised.right >= 95 ||
    normalised.top + normalised.bottom >= 95
  ) {
    throw new Error("Crop edges leave too little of the image.");
  }
  return normalised;
}

export function scanSourceRect(width: number, height: number, crop: ScanCrop) {
  const safe = normaliseScanCrop(crop);
  const x = Math.round(width * (safe.left / 100));
  const y = Math.round(height * (safe.top / 100));
  const cropWidth = Math.max(
    1,
    Math.round(width * (1 - (safe.left + safe.right) / 100)),
  );
  const cropHeight = Math.max(
    1,
    Math.round(height * (1 - (safe.top + safe.bottom) / 100)),
  );
  return { x, y, width: cropWidth, height: cropHeight };
}

export function scanOutputSize(
  width: number,
  height: number,
  rotation: ScanRotation,
) {
  return rotation === 90 || rotation === 270
    ? { width: height, height: width }
    : { width, height };
}

export function scanFilter(grayscale: boolean, contrast: number): string {
  const safeContrast = Math.min(200, Math.max(50, contrast));
  return `${grayscale ? "grayscale(1) " : ""}contrast(${safeContrast}%)`.trim();
}
