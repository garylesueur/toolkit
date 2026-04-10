import { PDFDocument, degrees } from "pdf-lib"
import type { RotationAngle } from "./constants"

/** Create a new PDF with the given rotations applied. rotations is a Map of 0-based page index → angle. */
export async function rotatePdfPages(
  sourceBytes: Uint8Array,
  rotations: Map<number, RotationAngle>,
): Promise<PDFDocument> {
  const pdfDoc = await PDFDocument.load(sourceBytes)
  const pages = pdfDoc.getPages()

  for (const [index, angle] of rotations) {
    if (index >= 0 && index < pages.length) {
      const page = pages[index]
      const current = page.getRotation().angle
      page.setRotation(degrees((current + angle) % 360))
    }
  }

  return pdfDoc
}
