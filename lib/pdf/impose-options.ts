export type ImpositionMode = "2-up" | "4-up" | "booklet";
export type ImpositionOrientation = "portrait" | "landscape";

export type ImpositionSlot = number | null;

export interface ImpositionSheet {
  slots: ImpositionSlot[];
}

export interface ImpositionGeometry {
  columns: number;
  rows: number;
  slotWidth: number;
  slotHeight: number;
}

export interface PagePlacement {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

export function pagesPerSheet(mode: ImpositionMode): number {
  return mode === "4-up" ? 4 : 2;
}

export function buildImpositionSheets(
  pageCount: number,
  mode: ImpositionMode,
): ImpositionSheet[] {
  if (!Number.isInteger(pageCount) || pageCount < 1) {
    throw new RangeError("PDF must contain at least one page");
  }

  if (mode !== "booklet") {
    const perSheet = pagesPerSheet(mode);
    const sheets: ImpositionSheet[] = [];
    for (let start = 0; start < pageCount; start += perSheet) {
      sheets.push({
        slots: Array.from({ length: perSheet }, (_, offset) => {
          const index = start + offset;
          return index < pageCount ? index : null;
        }),
      });
    }
    return sheets;
  }

  const paddedCount = Math.ceil(pageCount / 4) * 4;
  const sheets: ImpositionSheet[] = [];
  const sourceIndex = (index: number) => (index < pageCount ? index : null);
  for (let sheet = 0; sheet < paddedCount / 4; sheet++) {
    const low = sheet * 2;
    const high = paddedCount - 1 - sheet * 2;
    sheets.push({ slots: [sourceIndex(high), sourceIndex(low)] });
    sheets.push({ slots: [sourceIndex(low + 1), sourceIndex(high - 1)] });
  }
  return sheets;
}

export function calculateImpositionGeometry(
  pageWidth: number,
  pageHeight: number,
  mode: ImpositionMode,
  margin: number,
  gap: number,
): ImpositionGeometry {
  if (![pageWidth, pageHeight, margin, gap].every(Number.isFinite)) {
    throw new RangeError("Sheet geometry must contain finite values");
  }
  if (pageWidth <= 0 || pageHeight <= 0 || margin < 0 || gap < 0) {
    throw new RangeError(
      "Sheet size must be positive and spacing cannot be negative",
    );
  }
  const columns = 2;
  const rows = mode === "4-up" ? 2 : 1;
  const slotWidth = (pageWidth - margin * 2 - gap * (columns - 1)) / columns;
  const slotHeight = (pageHeight - margin * 2 - gap * (rows - 1)) / rows;
  if (slotWidth <= 0 || slotHeight <= 0) {
    throw new RangeError("Margins and gap leave no room for PDF pages");
  }
  return { columns, rows, slotWidth, slotHeight };
}

export function calculatePagePlacement(
  sourceWidth: number,
  sourceHeight: number,
  sheetWidth: number,
  sheetHeight: number,
  mode: ImpositionMode,
  slotIndex: number,
  margin: number,
  gap: number,
): PagePlacement {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new RangeError("Source page size must be positive");
  }
  const geometry = calculateImpositionGeometry(
    sheetWidth,
    sheetHeight,
    mode,
    margin,
    gap,
  );
  const slotCount = geometry.columns * geometry.rows;
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= slotCount) {
    throw new RangeError(`Slot index must be from 0 to ${slotCount - 1}`);
  }
  const column = slotIndex % geometry.columns;
  const row = Math.floor(slotIndex / geometry.columns);
  const slotX = margin + column * (geometry.slotWidth + gap);
  const slotY =
    sheetHeight - margin - (row + 1) * geometry.slotHeight - row * gap;
  const scale = Math.min(
    geometry.slotWidth / sourceWidth,
    geometry.slotHeight / sourceHeight,
  );
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return {
    x: slotX + (geometry.slotWidth - width) / 2,
    y: slotY + (geometry.slotHeight - height) / 2,
    width,
    height,
    scale,
  };
}
