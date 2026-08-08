import { PDFDocument } from "pdf-lib";

import { PAGE_SIZES, type PageSizeKey } from "./constants.ts";
import {
  buildImpositionSheets,
  calculatePagePlacement,
  type ImpositionMode,
  type ImpositionOrientation,
} from "./impose-options.ts";

export interface ImposePdfOptions {
  mode: ImpositionMode;
  pageSize: Extract<PageSizeKey, "A3" | "A4" | "Letter" | "Tabloid">;
  orientation: ImpositionOrientation;
  margin: number;
  gap: number;
}

export function imposedSheetSize(options: ImposePdfOptions) {
  const base = PAGE_SIZES[options.pageSize];
  const orientation =
    options.mode === "booklet" ? "landscape" : options.orientation;
  return orientation === "landscape"
    ? { width: base.height, height: base.width }
    : { width: base.width, height: base.height };
}

export async function imposePdf(
  sourceBytes: Uint8Array,
  options: ImposePdfOptions,
  onProgress?: (completed: number, total: number) => void,
): Promise<Uint8Array> {
  if (
    !Number.isFinite(options.margin) ||
    options.margin < 0 ||
    options.margin > 144
  ) {
    throw new RangeError("Margin must be from 0 to 144 points");
  }
  if (!Number.isFinite(options.gap) || options.gap < 0 || options.gap > 144) {
    throw new RangeError("Gap must be from 0 to 144 points");
  }

  const source = await PDFDocument.load(sourceBytes);
  const sheets = buildImpositionSheets(source.getPageCount(), options.mode);
  const output = await PDFDocument.create();
  const sheetSize = imposedSheetSize(options);

  for (let sheetIndex = 0; sheetIndex < sheets.length; sheetIndex++) {
    const outputPage = output.addPage([sheetSize.width, sheetSize.height]);
    const sheet = sheets[sheetIndex];
    for (let slotIndex = 0; slotIndex < sheet.slots.length; slotIndex++) {
      const sourceIndex = sheet.slots[slotIndex];
      if (sourceIndex === null) continue;
      const sourcePage = source.getPage(sourceIndex);
      const embedded = await output.embedPage(sourcePage);
      const placement = calculatePagePlacement(
        embedded.width,
        embedded.height,
        sheetSize.width,
        sheetSize.height,
        options.mode,
        slotIndex,
        options.margin,
        options.gap,
      );
      outputPage.drawPage(embedded, placement);
    }
    onProgress?.(sheetIndex + 1, sheets.length);
  }

  output.setTitle(
    options.mode === "booklet"
      ? "Booklet-imposed PDF"
      : `${options.mode} imposed PDF`,
  );
  output.setProducer("Toolkit - toolkit.lesueur.uk");
  return output.save({ useObjectStreams: true });
}
