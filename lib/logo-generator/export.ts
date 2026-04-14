import { downloadZip } from "client-zip";

const ICO_SIZES = [16, 32, 48] as const;

/** Every unique pixel size needed across all platform folders */
const ALL_SIZES = [
  16, 32, 48, 64, 70, 120, 128, 150, 152, 167, 180, 192, 256, 310, 512, 1024,
] as const;

interface ZipEntry {
  name: string;
  input: Blob;
}

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

/** Rasterise an SVG string to a PNG blob at the given pixel size */
function svgToPng(svgString: string, size: number): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    const svgBlob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas 2D context."));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, size, size);

      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("Canvas export failed")),
        "image/png",
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load SVG into image element."));
    };

    img.src = url;
  });
}

/**
 * Build a multi-resolution ICO file from PNG blobs.
 *
 * ICO layout:
 *   ICONDIR header (6 bytes)
 *   ICONDIRENTRY × n (16 bytes each)
 *   PNG payloads (concatenated)
 */
async function buildIco(
  entries: { size: number; blob: Blob }[],
): Promise<Blob> {
  const payloads = await Promise.all(entries.map((e) => e.blob.arrayBuffer()));

  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * entries.length;
  let dataOffset = headerSize + dirSize;

  const totalSize =
    headerSize +
    dirSize +
    payloads.reduce((sum, buf) => sum + buf.byteLength, 0);

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // type: 1 = ICO
  view.setUint16(4, entries.length, true); // image count

  for (let i = 0; i < entries.length; i++) {
    const offset = headerSize + i * dirEntrySize;
    const size = entries[i].size;
    const payloadLen = payloads[i].byteLength;

    view.setUint8(offset, size >= 256 ? 0 : size); // width (0 = 256)
    view.setUint8(offset + 1, size >= 256 ? 0 : size); // height
    view.setUint8(offset + 2, 0); // colour palette count
    view.setUint8(offset + 3, 0); // reserved
    view.setUint16(offset + 4, 1, true); // colour planes
    view.setUint16(offset + 6, 32, true); // bits per pixel
    view.setUint32(offset + 8, payloadLen, true); // image data size
    view.setUint32(offset + 12, dataOffset, true); // image data offset

    new Uint8Array(buffer, dataOffset, payloadLen).set(
      new Uint8Array(payloads[i]),
    );
    dataOffset += payloadLen;
  }

  return new Blob([buffer], { type: "image/x-icon" });
}

/** Trigger a browser download from a blob */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Helper to create a named PNG entry from the pre-rendered cache */
function png(
  cache: Map<number, Blob>,
  folder: string,
  size: number,
  filename?: string,
): ZipEntry {
  const blob = cache.get(size)!;
  const name = filename ?? `icon-${size}x${size}.png`;
  return { name: `${folder}/${name}`, input: blob };
}

// ---------------------------------------------------------------------------
// Platform folder builders
// ---------------------------------------------------------------------------

function faviconFiles(cache: Map<number, Blob>, icoBlob: Blob): ZipEntry[] {
  return [
    { name: "favicon/favicon.ico", input: icoBlob },
    png(cache, "favicon", 16, "favicon-16x16.png"),
    png(cache, "favicon", 32, "favicon-32x32.png"),
    png(cache, "favicon", 48, "favicon-48x48.png"),
  ];
}

function appleFiles(cache: Map<number, Blob>): ZipEntry[] {
  return [
    png(cache, "apple", 180, "apple-touch-icon.png"),
    png(cache, "apple", 152, "apple-touch-icon-152x152.png"),
    png(cache, "apple", 167, "apple-touch-icon-167x167.png"),
    png(cache, "apple", 120, "apple-touch-icon-120x120.png"),
    png(cache, "apple", 1024, "app-store-icon-1024x1024.png"),
  ];
}

function androidFiles(cache: Map<number, Blob>): ZipEntry[] {
  return [
    png(cache, "android", 192, "icon-192x192.png"),
    png(cache, "android", 512, "icon-512x512.png"),
  ];
}

function pwaFiles(cache: Map<number, Blob>): ZipEntry[] {
  const manifest = JSON.stringify(
    {
      name: "",
      short_name: "",
      icons: [
        {
          src: "/icon-192x192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/icon-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/icon-192x192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "maskable",
        },
        {
          src: "/icon-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
    null,
    2,
  );

  return [
    png(cache, "pwa", 192, "icon-192x192.png"),
    png(cache, "pwa", 512, "icon-512x512.png"),
    {
      name: "pwa/site.webmanifest",
      input: new Blob([manifest], { type: "application/json" }),
    },
  ];
}

function chromeExtensionFiles(cache: Map<number, Blob>): ZipEntry[] {
  const manifestSnippet = JSON.stringify(
    {
      icons: {
        "16": "icons/icon-16.png",
        "32": "icons/icon-32.png",
        "48": "icons/icon-48.png",
        "128": "icons/icon-128.png",
      },
    },
    null,
    2,
  );

  return [
    png(cache, "chrome-extension", 16, "icon-16.png"),
    png(cache, "chrome-extension", 32, "icon-32.png"),
    png(cache, "chrome-extension", 48, "icon-48.png"),
    png(cache, "chrome-extension", 128, "icon-128.png"),
    {
      name: "chrome-extension/manifest-icons.json",
      input: new Blob([manifestSnippet], { type: "application/json" }),
    },
  ];
}

function windowsFiles(cache: Map<number, Blob>): ZipEntry[] {
  const browserconfig = `<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
  <msapplication>
    <tile>
      <square70x70logo src="/ms-icon-70x70.png"/>
      <square150x150logo src="/ms-icon-150x150.png"/>
      <wide310x150logo src="/ms-icon-310x150.png"/>
      <square310x310logo src="/ms-icon-310x310.png"/>
    </tile>
  </msapplication>
</browserconfig>`;

  return [
    png(cache, "windows", 70, "ms-icon-70x70.png"),
    png(cache, "windows", 150, "ms-icon-150x150.png"),
    png(cache, "windows", 310, "ms-icon-310x310.png"),
    {
      name: "windows/browserconfig.xml",
      input: new Blob([browserconfig], { type: "application/xml" }),
    },
  ];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Download the logo as an SVG file */
export function downloadSvg(svgString: string, prefix: string) {
  const blob = new Blob([svgString], { type: "image/svg+xml" });
  downloadBlob(blob, `${prefix}-logo.svg`);
}

/** Download a single PNG at a specific size */
export async function downloadPng(
  svgString: string,
  size: number,
  prefix: string,
) {
  const blob = await svgToPng(svgString, size);
  downloadBlob(blob, `${prefix}-logo-${size}x${size}.png`);
}

/** Download the logo as an ICO file (16, 32, 48) */
export async function downloadIco(svgString: string, prefix: string) {
  const entries = await Promise.all(
    ICO_SIZES.map(async (size) => ({
      size,
      blob: await svgToPng(svgString, size),
    })),
  );
  const ico = await buildIco(entries);
  downloadBlob(ico, `${prefix}-logo.ico`);
}

/**
 * Download a ZIP organised by platform folder:
 *
 *   logo.svg
 *   logo.ico
 *   favicon/       — 16, 32, 48 + ico
 *   apple/         — 120, 152, 167, 180, 1024
 *   android/       — 192, 512
 *   pwa/           — 192, 512 + webmanifest
 *   chrome-extension/ — 16, 32, 48, 128 + manifest snippet
 *   windows/       — 70, 150, 310 + browserconfig.xml
 */
export async function downloadZipBundle(svgString: string, prefix: string) {
  // Render every unique size once
  const cache = new Map<number, Blob>();
  await Promise.all(
    ALL_SIZES.map(async (size) => {
      cache.set(size, await svgToPng(svgString, size));
    }),
  );

  // Build ICO from cached blobs
  const icoBlob = await buildIco(
    ICO_SIZES.map((size) => ({ size, blob: cache.get(size)! })),
  );

  const files: ZipEntry[] = [
    // Root
    {
      name: `${prefix}-logo.svg`,
      input: new Blob([svgString], { type: "image/svg+xml" }),
    },
    { name: `${prefix}-logo.ico`, input: icoBlob },

    // Platform folders
    ...faviconFiles(cache, icoBlob),
    ...appleFiles(cache),
    ...androidFiles(cache),
    ...pwaFiles(cache),
    ...chromeExtensionFiles(cache),
    ...windowsFiles(cache),
  ];

  const zipBlob = await downloadZip(files).blob();
  downloadBlob(zipBlob, `${prefix}-logo.zip`);
}
