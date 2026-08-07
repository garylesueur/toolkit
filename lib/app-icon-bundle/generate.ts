import { downloadZip } from "client-zip";

import { IOS_ICON_TARGETS } from "./targets";
import type {
  AppIconBundleOptions,
  AppIconSource,
  IosIconTarget,
} from "./types";

type ZipEntry = {
  name: string;
  input: Blob;
};

type CanvasRenderOptions = {
  backgroundColor: string | null;
  paddingPercent: number;
};

type AssetCatalogImage = {
  filename: string;
  idiom: IosIconTarget["idiom"];
  scale: IosIconTarget["scale"];
  size: string;
};

const IOS_APP_ICON_PATH = "ios/Assets.xcassets/AppIcon.appiconset";
const EXPO_ASSET_PATH = "expo/assets/images";
const MASTER_ICON_SIZE = 1024;

function textBlob(value: string, type: string): Blob {
  return new Blob([value], { type });
}

export function buildIosContents(): string {
  const images: AssetCatalogImage[] = IOS_ICON_TARGETS.map((target) => ({
    filename: target.filename,
    idiom: target.idiom,
    scale: target.scale,
    size: target.pointSize,
  }));

  return JSON.stringify(
    { images, info: { author: "xcode", version: 1 } },
    null,
    2,
  );
}

export function buildExpoConfig(backgroundColor: string): string {
  return JSON.stringify(
    {
      expo: {
        icon: "./assets/images/icon.png",
        android: {
          adaptiveIcon: {
            foregroundImage: "./assets/images/adaptive-icon.png",
            backgroundColor,
          },
        },
      },
    },
    null,
    2,
  );
}

function renderPng(
  source: AppIconSource,
  size: number,
  options: CanvasRenderOptions,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Failed to create a canvas context.");

  if (options.backgroundColor) {
    context.fillStyle = options.backgroundColor;
    context.fillRect(0, 0, size, size);
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  const padding = size * (options.paddingPercent / 100);
  const availableSize = size - padding * 2;
  const scale = Math.min(
    availableSize / source.naturalWidth,
    availableSize / source.naturalHeight,
  );
  const width = source.naturalWidth * scale;
  const height = source.naturalHeight * scale;
  context.drawImage(
    source,
    (size - width) / 2,
    (size - height) / 2,
    width,
    height,
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("PNG export failed.")),
      "image/png",
    );
  });
}

async function buildIosEntries(
  source: AppIconSource,
  options: AppIconBundleOptions,
): Promise<ZipEntry[]> {
  const images = await Promise.all(
    IOS_ICON_TARGETS.map(async (target) => ({
      target,
      blob: await renderPng(source, target.pixelSize, {
        backgroundColor: options.backgroundColor,
        paddingPercent: options.iconPaddingPercent,
      }),
    })),
  );

  return [
    ...images.map(({ target, blob }) => ({
      name: `${IOS_APP_ICON_PATH}/${target.filename}`,
      input: blob,
    })),
    {
      name: `${IOS_APP_ICON_PATH}/Contents.json`,
      input: textBlob(buildIosContents(), "application/json"),
    },
    {
      name: "ios/Assets.xcassets/Contents.json",
      input: textBlob(
        JSON.stringify({ info: { author: "xcode", version: 1 } }, null, 2),
        "application/json",
      ),
    },
  ];
}

async function buildExpoEntries(
  source: AppIconSource,
  options: AppIconBundleOptions,
): Promise<ZipEntry[]> {
  const [icon, adaptiveIcon] = await Promise.all([
    renderPng(source, MASTER_ICON_SIZE, {
      backgroundColor: options.backgroundColor,
      paddingPercent: options.iconPaddingPercent,
    }),
    renderPng(source, MASTER_ICON_SIZE, {
      backgroundColor: null,
      paddingPercent: options.adaptivePaddingPercent,
    }),
  ]);

  return [
    { name: `${EXPO_ASSET_PATH}/icon.png`, input: icon },
    { name: `${EXPO_ASSET_PATH}/adaptive-icon.png`, input: adaptiveIcon },
    {
      name: "expo/app-icon.config.json",
      input: textBlob(
        buildExpoConfig(options.backgroundColor),
        "application/json",
      ),
    },
  ];
}

function buildReadme(options: AppIconBundleOptions): string {
  const sections = [
    "APP ICON BUNDLE",
    "=================",
    "",
    "The images in this archive were generated locally in your browser.",
    "Do not add rounded corners to iOS icons; iOS applies the final mask.",
    "",
  ];

  if (options.platforms.includes("ios")) {
    sections.push(
      "iOS / Xcode",
      "-----------",
      "Replace your project's Assets.xcassets with ios/Assets.xcassets, or copy AppIcon.appiconset into the existing asset catalogue.",
      "Confirm that the target's App Icons Source is named AppIcon.",
      "",
    );
  }

  if (options.platforms.includes("expo-android")) {
    sections.push(
      "Expo / Android",
      "--------------",
      "Copy expo/assets/images/icon.png and adaptive-icon.png into your project.",
      "Merge expo/app-icon.config.json into app.json (or the equivalent app.config file).",
      "Run a new native build or Expo prebuild for icon changes to take effect.",
      "",
    );
  }

  return sections.join("\n");
}

export async function generateAppIconBundle(
  source: AppIconSource,
  options: AppIconBundleOptions,
): Promise<Blob> {
  const groups = await Promise.all([
    options.platforms.includes("ios")
      ? buildIosEntries(source, options)
      : Promise.resolve([]),
    options.platforms.includes("expo-android")
      ? buildExpoEntries(source, options)
      : Promise.resolve([]),
  ]);
  const entries = groups.flat();
  entries.push({
    name: "README.txt",
    input: textBlob(buildReadme(options), "text/plain"),
  });

  return downloadZip(entries).blob();
}

export async function renderAppIconPreview(
  source: AppIconSource,
  backgroundColor: string,
  paddingPercent: number,
): Promise<Blob> {
  return renderPng(source, 256, { backgroundColor, paddingPercent });
}
