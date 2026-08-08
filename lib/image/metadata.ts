export type ImageMetadataField = {
  category: "device" | "location" | "time" | "author" | "other";
  label: string;
  value: string;
};

export type ImageMetadataReport = {
  fields: ImageMetadataField[];
  format: "JPEG" | "PNG" | "WebP";
  metadataBlocks: string[];
};

function ascii(bytes: Uint8Array) {
  return new TextDecoder("latin1").decode(bytes);
}

function textCategory(label: string): ImageMetadataField["category"] {
  const lower = label.toLowerCase();
  if (/(?:author|artist|copyright|creator)/.test(lower)) return "author";
  if (/(?:gps|location|latitude|longitude)/.test(lower)) return "location";
  if (/(?:date|time|created|modified)/.test(lower)) return "time";
  if (/(?:camera|device|model|maker|lens)/.test(lower)) return "device";
  return "other";
}

function read32BE(bytes: Uint8Array, offset: number) {
  return (
    bytes[offset] * 0x1000000 +
    (bytes[offset + 1] << 16) +
    (bytes[offset + 2] << 8) +
    bytes[offset + 3]
  );
}

function parseExif(tiff: Uint8Array): ImageMetadataField[] {
  if (tiff.length < 8) return [];
  const little = ascii(tiff.subarray(0, 2)) === "II";
  if (!little && ascii(tiff.subarray(0, 2)) !== "MM") return [];
  const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
  const u16 = (offset: number) =>
    offset >= 0 && offset + 2 <= tiff.length
      ? view.getUint16(offset, little)
      : null;
  const u32 = (offset: number) =>
    offset >= 0 && offset + 4 <= tiff.length
      ? view.getUint32(offset, little)
      : null;
  if (u16(2) !== 42) return [];

  const fields: ImageMetadataField[] = [];
  const seen = new Set<number>();
  const typeSize: Record<number, number> = {
    1: 1,
    2: 1,
    3: 2,
    4: 4,
    5: 8,
    7: 1,
    9: 4,
    10: 8,
  };
  const valueBytes = (entryOffset: number, type: number, count: number) => {
    const length = (typeSize[type] ?? 1) * count;
    const start = length <= 4 ? entryOffset + 8 : u32(entryOffset + 8);
    if (start === null || start < 0 || start + length > tiff.length)
      return null;
    return tiff.subarray(start, start + length);
  };
  const textAt = (entryOffset: number, type: number, count: number) => {
    const bytes = valueBytes(entryOffset, type, count);
    if (!bytes) return "";
    let value = ascii(bytes);
    while (value.endsWith("\0")) value = value.slice(0, -1);
    return value.trim();
  };
  const numberAt = (entryOffset: number, type: number, count: number) => {
    if (count < 1) return null;
    const bytes = valueBytes(entryOffset, type, count);
    if (!bytes) return null;
    const local = new DataView(
      bytes.buffer,
      bytes.byteOffset,
      bytes.byteLength,
    );
    if (type === 3) return local.getUint16(0, little);
    if (type === 4) return local.getUint32(0, little);
    return null;
  };
  const rationalsAt = (entryOffset: number, type: number, count: number) => {
    if (type !== 5) return [];
    const bytes = valueBytes(entryOffset, type, count);
    if (!bytes) return [];
    const local = new DataView(
      bytes.buffer,
      bytes.byteOffset,
      bytes.byteLength,
    );
    return Array.from({ length: count }, (_, index) => {
      const numerator = local.getUint32(index * 8, little);
      const denominator = local.getUint32(index * 8 + 4, little);
      return denominator ? numerator / denominator : 0;
    });
  };
  const add = (
    category: ImageMetadataField["category"],
    label: string,
    value: string,
  ) => {
    if (value) fields.push({ category, label, value });
  };

  const parseIfd = (offset: number, kind: "main" | "exif" | "gps") => {
    if (seen.has(offset) || offset < 0 || offset + 2 > tiff.length) return;
    seen.add(offset);
    const count = u16(offset);
    if (count === null || count > 512 || offset + 2 + count * 12 > tiff.length)
      return;
    let latitudeRef = "";
    let longitudeRef = "";
    let latitude: number[] = [];
    let longitude: number[] = [];
    for (let index = 0; index < count; index++) {
      const entry = offset + 2 + index * 12;
      const tag = u16(entry);
      const type = u16(entry + 2);
      const valueCount = u32(entry + 4);
      if (tag === null || type === null || valueCount === null) continue;
      const text = () => textAt(entry, type, valueCount);
      if (kind === "main") {
        if (tag === 0x010f) add("device", "Camera maker", text());
        else if (tag === 0x0110) add("device", "Camera model", text());
        else if (tag === 0x0131) add("other", "Software", text());
        else if (tag === 0x0132) add("time", "Modified", text());
        else if (tag === 0x013b) add("author", "Artist", text());
        else if (tag === 0x8298) add("author", "Copyright", text());
        else if (tag === 0x8769) {
          const pointer = numberAt(entry, type, valueCount);
          if (pointer !== null) parseIfd(pointer, "exif");
        } else if (tag === 0x8825) {
          const pointer = numberAt(entry, type, valueCount);
          if (pointer !== null) parseIfd(pointer, "gps");
        }
      } else if (kind === "exif") {
        if (tag === 0x9003) add("time", "Captured", text());
        else if (tag === 0xa433) add("device", "Lens maker", text());
        else if (tag === 0xa434) add("device", "Lens model", text());
        else if (tag === 0x9286) add("other", "User comment", text());
      } else {
        if (tag === 1) latitudeRef = text();
        else if (tag === 2) latitude = rationalsAt(entry, type, valueCount);
        else if (tag === 3) longitudeRef = text();
        else if (tag === 4) longitude = rationalsAt(entry, type, valueCount);
      }
    }
    if (kind === "gps" && latitude.length === 3 && longitude.length === 3) {
      const decimal = (parts: number[], ref: string) => {
        const value = parts[0] + parts[1] / 60 + parts[2] / 3600;
        return ["S", "W"].includes(ref.toUpperCase()) ? -value : value;
      };
      add(
        "location",
        "GPS coordinates",
        `${decimal(latitude, latitudeRef).toFixed(6)}, ${decimal(longitude, longitudeRef).toFixed(6)}`,
      );
    }
  };
  const firstIfd = u32(4);
  if (firstIfd !== null) parseIfd(firstIfd, "main");
  return fields;
}

function inspectJpeg(bytes: Uint8Array): ImageMetadataReport {
  const fields: ImageMetadataField[] = [];
  const metadataBlocks: string[] = [];
  let offset = 2;
  while (offset + 4 <= bytes.length && bytes[offset] === 0xff) {
    const marker = bytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) break;
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2 || offset + 2 + length > bytes.length) break;
    const data = bytes.subarray(offset + 4, offset + 2 + length);
    if (marker === 0xe1 && ascii(data.subarray(0, 6)) === "Exif\0\0") {
      metadataBlocks.push("EXIF");
      fields.push(...parseExif(data.subarray(6)));
    } else if (marker === 0xe1) metadataBlocks.push("XMP");
    else if (
      marker === 0xe2 &&
      ascii(data.subarray(0, 11)).startsWith("ICC_PROFILE")
    )
      metadataBlocks.push("ICC colour profile");
    else if (marker === 0xed) metadataBlocks.push("IPTC / Photoshop metadata");
    else if (marker === 0xfe) {
      metadataBlocks.push("JPEG comment");
      fields.push({
        category: "other",
        label: "Comment",
        value: ascii(data).trim(),
      });
    }
    offset += 2 + length;
  }
  return {
    fields,
    format: "JPEG",
    metadataBlocks: [...new Set(metadataBlocks)],
  };
}

function inspectPng(bytes: Uint8Array): ImageMetadataReport {
  const fields: ImageMetadataField[] = [];
  const metadataBlocks: string[] = [];
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = read32BE(bytes, offset);
    const type = ascii(bytes.subarray(offset + 4, offset + 8));
    if (offset + 12 + length > bytes.length) break;
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === "tEXt") {
      metadataBlocks.push("PNG text");
      const separator = data.indexOf(0);
      const label =
        separator >= 0 ? ascii(data.subarray(0, separator)) : "Text";
      fields.push({
        category: textCategory(label),
        label,
        value:
          separator >= 0 ? ascii(data.subarray(separator + 1)) : ascii(data),
      });
    } else if (["zTXt", "iTXt"].includes(type))
      metadataBlocks.push("PNG compressed/international text");
    else if (type === "eXIf") {
      metadataBlocks.push("EXIF");
      fields.push(...parseExif(data));
    } else if (type === "iCCP") metadataBlocks.push("ICC colour profile");
    else if (type === "tIME") metadataBlocks.push("PNG modification time");
    else if (type === "pHYs") metadataBlocks.push("Pixel density");
    offset += 12 + length;
    if (type === "IEND") break;
  }
  return {
    fields,
    format: "PNG",
    metadataBlocks: [...new Set(metadataBlocks)],
  };
}

function inspectWebp(bytes: Uint8Array): ImageMetadataReport {
  const fields: ImageMetadataField[] = [];
  const metadataBlocks: string[] = [];
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const type = ascii(bytes.subarray(offset, offset + 4));
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset + 4, 4);
    const length = view.getUint32(0, true);
    if (offset + 8 + length > bytes.length) break;
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === "EXIF") {
      metadataBlocks.push("EXIF");
      fields.push(
        ...parseExif(
          ascii(data.subarray(0, 6)) === "Exif\0\0" ? data.subarray(6) : data,
        ),
      );
    } else if (type === "XMP ") metadataBlocks.push("XMP");
    else if (type === "ICCP") metadataBlocks.push("ICC colour profile");
    offset += 8 + length + (length % 2);
  }
  return {
    fields,
    format: "WebP",
    metadataBlocks: [...new Set(metadataBlocks)],
  };
}

export function inspectImageMetadata(bytes: Uint8Array): ImageMetadataReport {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8)
    return inspectJpeg(bytes);
  if (bytes.length >= 8 && ascii(bytes.subarray(1, 4)) === "PNG")
    return inspectPng(bytes);
  if (
    bytes.length >= 12 &&
    ascii(bytes.subarray(0, 4)) === "RIFF" &&
    ascii(bytes.subarray(8, 12)) === "WEBP"
  )
    return inspectWebp(bytes);
  throw new Error("Choose a JPEG, PNG, or WebP image.");
}
