export type StrongCompressionPreset = "balanced" | "smaller" | "smallest";

export type StrongCompressionSettings = {
  dpi: number;
  jpegQuality: number;
  label: string;
  description: string;
};

export const STRONG_COMPRESSION_PRESETS: Record<
  StrongCompressionPreset,
  StrongCompressionSettings
> = {
  balanced: {
    dpi: 144,
    jpegQuality: 0.72,
    label: "Balanced",
    description: "Sharper text and diagrams",
  },
  smaller: {
    dpi: 110,
    jpegQuality: 0.58,
    label: "Smaller",
    description: "Good for screen sharing",
  },
  smallest: {
    dpi: 90,
    jpegQuality: 0.45,
    label: "Smallest",
    description: "Maximum size reduction",
  },
};

export const STRONG_COMPRESSION_LOSSES = [
  "selectable text and search",
  "links and bookmarks",
  "forms, signatures, and annotations",
  "layers and accessibility structure",
] as const;

export function strongCompressionSettings(
  preset: StrongCompressionPreset,
): StrongCompressionSettings {
  const settings = STRONG_COMPRESSION_PRESETS[preset];
  if (!settings) throw new Error("Choose a supported compression preset.");
  return settings;
}

export function dpiToPdfScale(dpi: number): number {
  if (!Number.isFinite(dpi) || dpi < 36 || dpi > 300) {
    throw new Error("Compression resolution must be from 36 to 300 DPI.");
  }
  return dpi / 72;
}

export function compressionSavings(
  originalSize: number,
  outputSize: number,
): { savedSize: number; savedPercent: number; useOriginal: boolean } {
  if (
    !Number.isFinite(originalSize) ||
    !Number.isFinite(outputSize) ||
    originalSize < 0 ||
    outputSize < 0
  ) {
    throw new Error("PDF sizes must be non-negative finite numbers.");
  }
  const useOriginal = outputSize >= originalSize;
  const savedSize = useOriginal ? 0 : originalSize - outputSize;
  return {
    savedSize,
    savedPercent:
      originalSize === 0 ? 0 : Math.round((savedSize / originalSize) * 100),
    useOriginal,
  };
}
