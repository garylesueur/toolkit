/** Standard page sizes in PDF points (1 pt = 1/72 inch). */
export const PAGE_SIZES = {
  A3: { width: 841.89, height: 1190.55, label: "A3" },
  A4: { width: 595.28, height: 841.89, label: "A4" },
  A5: { width: 419.53, height: 595.28, label: "A5" },
  Letter: { width: 612, height: 792, label: "Letter" },
  Legal: { width: 612, height: 1008, label: "Legal" },
  Tabloid: { width: 792, height: 1224, label: "Tabloid" },
} as const

export type PageSizeKey = keyof typeof PAGE_SIZES

export const ROTATION_ANGLES = [0, 90, 180, 270] as const
export type RotationAngle = (typeof ROTATION_ANGLES)[number]

/** Maximum file size we accept (200 MB). */
export const MAX_PDF_SIZE = 200 * 1024 * 1024
