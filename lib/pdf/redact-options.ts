export type RedactionQuality = "screen" | "print";

export type RedactionBox = {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export const REDACTION_QUALITY = {
  screen: {
    label: "Screen",
    description: "144 DPI · smaller output",
    dpi: 144,
    jpegQuality: 0.9,
  },
  print: {
    label: "Print",
    description: "216 DPI · sharper output",
    dpi: 216,
    jpegQuality: 0.93,
  },
} as const;

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function stableUnit(value: number): number {
  return Math.round(clampUnit(value) * 1_000_000_000_000) / 1_000_000_000_000;
}

export function normaliseRedactionBox(
  pageIndex: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  surfaceWidth: number,
  surfaceHeight: number,
): RedactionBox {
  if (
    !Number.isInteger(pageIndex) ||
    pageIndex < 0 ||
    !Number.isFinite(surfaceWidth) ||
    !Number.isFinite(surfaceHeight) ||
    surfaceWidth <= 0 ||
    surfaceHeight <= 0
  ) {
    throw new Error("The redaction surface is invalid.");
  }
  const left = stableUnit(Math.min(startX, endX) / surfaceWidth);
  const top = stableUnit(Math.min(startY, endY) / surfaceHeight);
  const right = stableUnit(Math.max(startX, endX) / surfaceWidth);
  const bottom = stableUnit(Math.max(startY, endY) / surfaceHeight);
  return {
    pageIndex,
    x: left,
    y: top,
    width: stableUnit(right - left),
    height: stableUnit(bottom - top),
  };
}

export function validateRedactions(
  boxes: RedactionBox[],
  pageCount: number,
): void {
  if (!Number.isInteger(pageCount) || pageCount < 1) {
    throw new Error("The PDF has no pages to redact.");
  }
  if (!boxes.length) throw new Error("Draw at least one redaction area.");
  for (const box of boxes) {
    const values = [box.x, box.y, box.width, box.height];
    if (
      !Number.isInteger(box.pageIndex) ||
      box.pageIndex < 0 ||
      box.pageIndex >= pageCount ||
      values.some((value) => !Number.isFinite(value)) ||
      box.x < 0 ||
      box.y < 0 ||
      box.width <= 0.002 ||
      box.height <= 0.002 ||
      box.x + box.width > 1.000001 ||
      box.y + box.height > 1.000001
    ) {
      throw new Error("A redaction area is outside its PDF page.");
    }
  }
}

export function redactionBoxFromPercentages(
  pageIndex: number,
  left: number,
  top: number,
  width: number,
  height: number,
): RedactionBox {
  const box = {
    pageIndex,
    x: left / 100,
    y: top / 100,
    width: width / 100,
    height: height / 100,
  };
  validateRedactions([box], pageIndex + 1);
  return box;
}

export function redactionCanvasRect(
  box: RedactionBox,
  canvasWidth: number,
  canvasHeight: number,
): { x: number; y: number; width: number; height: number } {
  return {
    x: box.x * canvasWidth,
    y: box.y * canvasHeight,
    width: box.width * canvasWidth,
    height: box.height * canvasHeight,
  };
}

export function redactionPreviewStyle(box: RedactionBox) {
  return {
    left: `${box.x * 100}%`,
    top: `${box.y * 100}%`,
    width: `${box.width * 100}%`,
    height: `${box.height * 100}%`,
  };
}

export function redactionsOnPage(
  boxes: RedactionBox[],
  pageIndex: number,
): RedactionBox[] {
  return boxes.filter((box) => box.pageIndex === pageIndex);
}
