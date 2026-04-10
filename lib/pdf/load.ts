import { PDFDocument } from "pdf-lib"
import { MAX_PDF_SIZE } from "./constants"

export type LoadedPdf = {
  pdfDoc: PDFDocument
  bytes: Uint8Array
}

/** Read a File into a Uint8Array and parse it with pdf-lib. */
export async function loadPdfFile(file: File): Promise<LoadedPdf> {
  const error = validatePdfFile(file)
  if (error) throw new Error(error)

  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)

  try {
    const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true })
    return { pdfDoc, bytes }
  } catch (err) {
    if (
      err instanceof Error &&
      err.message.toLowerCase().includes("encrypt")
    ) {
      throw new Error(
        "This PDF is password-protected and cannot be processed in the browser.",
      )
    }
    throw new Error("Failed to load PDF — the file may be corrupted.")
  }
}

/** Load pdf-lib PDFDocument from raw bytes. */
export async function loadPdfBytes(bytes: Uint8Array): Promise<PDFDocument> {
  return PDFDocument.load(bytes, { ignoreEncryption: true })
}

/** Returns an error message, or null if valid. */
function validatePdfFile(file: File): string | null {
  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    return "File is not a PDF."
  }
  if (file.size > MAX_PDF_SIZE) {
    return `File is too large (${(file.size / 1024 / 1024).toFixed(0)} MB). Maximum is ${MAX_PDF_SIZE / 1024 / 1024} MB.`
  }
  return null
}
