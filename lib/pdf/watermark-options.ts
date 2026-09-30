export type WatermarkPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "center"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type WatermarkLayer = "foreground" | "background";

export function watermarkPoint(
  pageWidth: number,
  pageHeight: number,
  itemWidth: number,
  itemHeight: number,
  rotationDegrees: number,
  margin: number,
  position: WatermarkPosition,
): { x: number; y: number } {
  const radians = (rotationDegrees * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const corners = [
    { x: 0, y: 0 },
    { x: itemWidth * cosine, y: itemWidth * sine },
    { x: -itemHeight * sine, y: itemHeight * cosine },
    {
      x: itemWidth * cosine - itemHeight * sine,
      y: itemWidth * sine + itemHeight * cosine,
    },
  ];
  const minX = Math.min(...corners.map((corner) => corner.x));
  const maxX = Math.max(...corners.map((corner) => corner.x));
  const minY = Math.min(...corners.map((corner) => corner.y));
  const maxY = Math.max(...corners.map((corner) => corner.y));
  const rotatedWidth = maxX - minX;
  const rotatedHeight = maxY - minY;

  const horizontal = position === "center" ? "center" : position.split("-")[1];
  const vertical = position === "center" ? "middle" : position.split("-")[0];
  const left =
    horizontal === "left"
      ? margin
      : horizontal === "right"
        ? pageWidth - margin - rotatedWidth
        : (pageWidth - rotatedWidth) / 2;
  const bottom =
    vertical === "bottom"
      ? margin
      : vertical === "top"
        ? pageHeight - margin - rotatedHeight
        : (pageHeight - rotatedHeight) / 2;

  return { x: left - minX, y: bottom - minY };
}

export function watermarkPageIndices(
  selectedPages: number[],
  totalPages: number,
): number[] {
  if (totalPages < 1) throw new Error("The PDF has no pages.");
  if (selectedPages.length === 0) {
    return Array.from({ length: totalPages }, (_, index) => index);
  }
  const indices = [...new Set(selectedPages)].sort((a, b) => a - b);
  if (indices.some((index) => index < 0 || index >= totalPages)) {
    throw new Error(`Selected pages must be between 1 and ${totalPages}.`);
  }
  return indices;
}
