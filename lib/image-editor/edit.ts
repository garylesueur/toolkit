export type ImageEditFormat =
  | "image/png"
  | "image/jpeg"
  | "image/webp"
  | "image/avif";

export type CropPreset = "original" | "1:1" | "4:3" | "3:2" | "16:9";

export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageEditPlan {
  crop: PixelRect;
  outputWidth: number;
  outputHeight: number;
}

export interface ImageEditOptions {
  cropPreset: CropPreset;
  focalX: number;
  focalY: number;
  outputWidth: number;
  format: ImageEditFormat;
  quality: number;
}

const ASPECT_RATIOS: Record<Exclude<CropPreset, "original">, number> = {
  "1:1": 1,
  "4:3": 4 / 3,
  "3:2": 3 / 2,
  "16:9": 16 / 9,
};

const MAX_DIMENSION = 16_384;
const MAX_PIXELS = 40_000_000;

function requireDimension(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 1 || value > MAX_DIMENSION) {
    throw new RangeError(
      `${label} must be a whole number from 1 to ${MAX_DIMENSION}`,
    );
  }
  return value;
}

function requireFocalPoint(value: number): number {
  if (!Number.isFinite(value))
    throw new RangeError("Crop position must be finite");
  return Math.min(1, Math.max(0, value));
}

export function calculateCropRect(
  sourceWidth: number,
  sourceHeight: number,
  preset: CropPreset,
  focalX = 0.5,
  focalY = 0.5,
): PixelRect {
  const width = requireDimension(sourceWidth, "Source width");
  const height = requireDimension(sourceHeight, "Source height");
  if (preset === "original") return { x: 0, y: 0, width, height };

  const targetRatio = ASPECT_RATIOS[preset];
  const sourceRatio = width / height;
  let cropWidth = width;
  let cropHeight = height;
  if (sourceRatio > targetRatio) cropWidth = Math.round(height * targetRatio);
  else cropHeight = Math.round(width / targetRatio);

  const x = Math.round((width - cropWidth) * requireFocalPoint(focalX));
  const y = Math.round((height - cropHeight) * requireFocalPoint(focalY));
  return { x, y, width: cropWidth, height: cropHeight };
}

export function createImageEditPlan(
  sourceWidth: number,
  sourceHeight: number,
  options: Pick<
    ImageEditOptions,
    "cropPreset" | "focalX" | "focalY" | "outputWidth"
  >,
): ImageEditPlan {
  const crop = calculateCropRect(
    sourceWidth,
    sourceHeight,
    options.cropPreset,
    options.focalX,
    options.focalY,
  );
  const outputWidth = requireDimension(options.outputWidth, "Output width");
  const outputHeight = Math.max(
    1,
    Math.round(outputWidth * (crop.height / crop.width)),
  );
  requireDimension(outputHeight, "Output height");
  if (outputWidth * outputHeight > MAX_PIXELS) {
    throw new RangeError(
      "Output is limited to 40 megapixels for browser safety",
    );
  }
  return { crop, outputWidth, outputHeight };
}

export function imageEditFileName(
  name: string,
  format: ImageEditFormat,
): string {
  const extension = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/avif": "avif",
  }[format];
  const base = name.replace(/\.(?:jpe?g|png|webp|avif|gif)$/i, "") || "image";
  return `${base}-edited.${extension}`;
}

export function formatSupportsQuality(format: ImageEditFormat): boolean {
  return format !== "image/png";
}

export async function editImage(
  file: File,
  options: ImageEditOptions,
): Promise<{ blob: Blob; plan: ImageEditPlan; fileName: string }> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file");
  if (
    !Number.isFinite(options.quality) ||
    options.quality < 0.1 ||
    options.quality > 1
  ) {
    throw new RangeError("Quality must be between 0.1 and 1");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const plan = createImageEditPlan(bitmap.width, bitmap.height, options);
    const canvas = document.createElement("canvas");
    canvas.width = plan.outputWidth;
    canvas.height = plan.outputHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not create a Canvas 2D context");
    if (options.format === "image/jpeg") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      bitmap,
      plan.crop.x,
      plan.crop.y,
      plan.crop.width,
      plan.crop.height,
      0,
      0,
      plan.outputWidth,
      plan.outputHeight,
    );

    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) =>
          result
            ? resolve(result)
            : reject(new Error(`This browser cannot export ${options.format}`)),
        options.format,
        formatSupportsQuality(options.format) ? options.quality : undefined,
      ),
    );
    if (blob.type !== options.format) {
      throw new Error(`This browser cannot export ${options.format}`);
    }
    return {
      blob,
      plan,
      fileName: imageEditFileName(file.name, options.format),
    };
  } finally {
    bitmap.close();
  }
}

export function browserSupportsImageFormat(format: ImageEditFormat): boolean {
  if (typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL(format).startsWith(`data:${format}`);
}
