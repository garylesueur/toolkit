export type CropMargins = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

export type PdfBox = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export function calculateCropBox(box: PdfBox, margins: CropMargins): PdfBox {
  for (const [side, value] of Object.entries(margins)) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(
        `${side[0].toUpperCase()}${side.slice(1)} margin must be zero or greater.`,
      );
    }
  }

  const width = box.width - margins.left - margins.right;
  const height = box.height - margins.top - margins.bottom;
  if (width < 1 || height < 1) {
    throw new Error("Those margins remove the entire visible page area.");
  }

  return {
    height,
    width,
    x: box.x + margins.left,
    y: box.y + margins.bottom,
  };
}

export function cropPageIndices(
  selectedPages: number[],
  totalPages: number,
): number[] {
  if (totalPages < 1) throw new Error("The PDF has no pages.");
  if (selectedPages.length === 0)
    return Array.from({ length: totalPages }, (_, index) => index);
  const indices = [...new Set(selectedPages)].sort((a, b) => a - b);
  if (indices.some((index) => index < 0 || index >= totalPages)) {
    throw new Error(`Selected pages must be between 1 and ${totalPages}.`);
  }
  return indices;
}

export function cropPreviewInsets(box: PdfBox, margins: CropMargins) {
  return {
    bottom: `${Math.min(100, (margins.bottom / box.height) * 100)}%`,
    left: `${Math.min(100, (margins.left / box.width) * 100)}%`,
    right: `${Math.min(100, (margins.right / box.width) * 100)}%`,
    top: `${Math.min(100, (margins.top / box.height) * 100)}%`,
  };
}
