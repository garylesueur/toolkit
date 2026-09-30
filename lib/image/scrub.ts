export type ScrubbableImageType = "image/jpeg" | "image/png" | "image/webp";

export function imageTypeForFile(
  file: Pick<File, "name" | "type">,
): ScrubbableImageType {
  if (["image/jpeg", "image/png", "image/webp"].includes(file.type))
    return file.type as ScrubbableImageType;
  const extension = file.name.toLowerCase().split(".").pop();
  if (["jpg", "jpeg"].includes(extension ?? "")) return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  throw new Error("Choose a JPEG, PNG, or WebP image.");
}

export function scrubbedImageName(name: string, type: ScrubbableImageType) {
  const extension = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  }[type];
  const base = name.replace(/\.(?:jpe?g|png|webp)$/i, "") || "image";
  return `${base}-metadata-removed.${extension}`;
}

export async function scrubImageMetadata(
  file: File,
  quality = 0.92,
): Promise<{ blob: Blob; fileName: string; type: ScrubbableImageType }> {
  const type = imageTypeForFile(file);
  if (!Number.isFinite(quality) || quality < 0.5 || quality > 1)
    throw new Error("Image quality must be between 0.5 and 1.");
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d")!;
    if (type === "image/jpeg") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(bitmap, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (output) =>
          output
            ? resolve(output)
            : reject(new Error("Could not re-encode this image.")),
        type,
        type === "image/png" ? undefined : quality,
      ),
    );
    return { blob, fileName: scrubbedImageName(file.name, type), type };
  } finally {
    bitmap.close();
  }
}
