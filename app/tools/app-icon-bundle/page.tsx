"use client";

import {
  RiAndroidLine,
  RiAppleLine,
  RiDownload2Line,
  RiUploadCloud2Line,
} from "@remixicon/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ImageToolHandoff } from "@/components/image-tool-handoff";
import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  generateAppIconBundle,
  renderAppIconPreview,
} from "@/lib/app-icon-bundle/generate";
import { takeIconBundleHandoff } from "@/lib/app-icon-bundle/handoff";
import { MIN_RECOMMENDED_SOURCE_SIZE } from "@/lib/app-icon-bundle/targets";
import type {
  AppIconPlatform,
  AppIconSource,
} from "@/lib/app-icon-bundle/types";
import {
  clearImageHandoff,
  readImageHandoff,
} from "@/lib/tool-handoff/storage";
import { cn } from "@/lib/utils";

type SourceDetails = {
  filename: string;
  width: number;
  height: number;
};

const DEFAULT_BACKGROUND = "#ffffff";
const DEFAULT_ADAPTIVE_PADDING = 18;
const ACCEPTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
];

function safeArchiveName(filename: string): string {
  const withoutExtension = filename.replace(/\.[^.]+$/, "");
  const safe = withoutExtension
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return safe || "app-icon";
}

export default function AppIconBundlePage() {
  const [source, setSource] = useState<AppIconSource | null>(null);
  const [sourceBlob, setSourceBlob] = useState<Blob | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceDetails, setSourceDetails] = useState<SourceDetails | null>(
    null,
  );
  const [platforms, setPlatforms] = useState<AppIconPlatform[]>([
    "ios",
    "expo-android",
  ]);
  const [backgroundColor, setBackgroundColor] = useState(DEFAULT_BACKGROUND);
  const [iconPadding, setIconPadding] = useState(0);
  const [adaptivePadding, setAdaptivePadding] = useState(
    DEFAULT_ADAPTIVE_PADDING,
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sourceUrlRef = useRef<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const loadBlob = useCallback((blob: Blob, filename: string) => {
    if (!ACCEPTED_IMAGE_TYPES.includes(blob.type)) {
      setError("Choose a PNG, JPG, WebP, or SVG image.");
      return;
    }

    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      setSource(image);
      setSourceBlob(blob);
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
      sourceUrlRef.current = url;
      setSourceUrl(url);
      setSourceDetails({
        filename,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
      setZipBlob(null);
      setError(null);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      setError("That image could not be loaded.");
    };
    image.src = url;
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadHandoff() {
      try {
        const sharedHandoff = await readImageHandoff();
        if (sharedHandoff && !cancelled) {
          loadBlob(sharedHandoff.blob, sharedHandoff.filename);
          await clearImageHandoff();
          return;
        }

        const legacyHandoff = takeIconBundleHandoff();
        if (legacyHandoff && !cancelled) {
          loadBlob(
            new Blob([legacyHandoff.svg], { type: "image/svg+xml" }),
            legacyHandoff.filename,
          );
        }
      } catch {
        if (!cancelled) {
          setError("The icon passed from another tool could not be loaded.");
        }
      }
    }

    loadHandoff();
    return () => {
      cancelled = true;
    };
  }, [loadBlob]);

  const getSourceArtifact = useCallback(async () => {
    if (!sourceBlob || !sourceDetails) {
      throw new Error("No source icon is available.");
    }
    return {
      blob: sourceBlob,
      filename: sourceDetails.filename,
      sourceHref: "/tools/app-icon-bundle",
    };
  }, [sourceBlob, sourceDetails]);

  useEffect(() => {
    if (!source) return;
    let cancelled = false;

    renderAppIconPreview(source, backgroundColor, iconPadding)
      .then((blob) => {
        if (cancelled) return;
        const nextUrl = URL.createObjectURL(blob);
        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
        }
        previewUrlRef.current = nextUrl;
        setPreviewUrl(nextUrl);
      })
      .catch(() => setError("The icon preview could not be rendered."));

    setZipBlob(null);
    return () => {
      cancelled = true;
    };
  }, [source, backgroundColor, iconPadding, adaptivePadding, platforms]);

  useEffect(
    () => () => {
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  const togglePlatform = useCallback((platform: AppIconPlatform) => {
    setPlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform],
    );
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!source || platforms.length === 0) return;
    setGenerating(true);
    setError(null);
    try {
      const blob = await generateAppIconBundle(source, {
        platforms,
        backgroundColor,
        iconPaddingPercent: iconPadding,
        adaptivePaddingPercent: adaptivePadding,
      });
      setZipBlob(blob);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "The icon bundle could not be generated.",
      );
    } finally {
      setGenerating(false);
    }
  }, [source, platforms, backgroundColor, iconPadding, adaptivePadding]);

  const handleDownload = useCallback(() => {
    if (!zipBlob) return;
    const url = URL.createObjectURL(zipBlob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeArchiveName(sourceDetails?.filename ?? "app-icon")}-bundle.zip`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [zipBlob, sourceDetails]);

  const handleFile = useCallback(
    (file: File) => loadBlob(file, file.name),
    [loadBlob],
  );

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">App Icon Bundle</h1>
      <p className="text-muted-foreground mt-1 max-w-2xl">
        Turn one source icon into a complete Xcode asset catalogue and
        Expo-ready Android icon set, packaged in the right folder structure.
      </p>
      <PrivacyBanner>
        Your icon is resized and packaged entirely in your browser. Nothing is
        uploaded or stored.
      </PrivacyBanner>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          const file = event.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        className={cn(
          "mt-8 flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground/40",
        )}
      >
        {sourceUrl && sourceDetails ? (
          <div className="flex items-center gap-4">
            <img
              src={sourceUrl}
              alt="Source icon"
              className="size-20 rounded-lg object-contain"
            />
            <div className="text-left">
              <p className="text-sm font-medium">{sourceDetails.filename}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {sourceDetails.width}×{sourceDetails.height} · click or drop to
                replace
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <RiUploadCloud2Line className="text-muted-foreground size-10" />
            <p className="text-sm font-medium">
              Drop an icon here, or click to browse
            </p>
            <p className="text-muted-foreground text-xs">
              PNG, JPG, WebP, or SVG · 1024×1024 recommended
            </p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleFile(file);
            event.target.value = "";
          }}
        />
      </button>

      {sourceDetails &&
        Math.min(sourceDetails.width, sourceDetails.height) <
          MIN_RECOMMENDED_SOURCE_SIZE && (
          <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">
            This source is smaller than 1024×1024, so the App Store icon will be
            upscaled and may look soft.
          </p>
        )}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {source && (
        <div className="mt-8 grid gap-8 md:grid-cols-[1fr_280px]">
          <div className="space-y-8">
            <section>
              <h2 className="text-lg font-semibold">Choose outputs</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  aria-pressed={platforms.includes("ios")}
                  onClick={() => togglePlatform("ios")}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-colors",
                    platforms.includes("ios")
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <RiAppleLine className="size-6" aria-hidden />
                  <span className="mt-3 block font-medium">iOS + Xcode</span>
                  <span className="text-muted-foreground mt-1 block text-xs leading-relaxed">
                    Assets.xcassets/AppIcon.appiconset with iPhone, iPad, and
                    App Store sizes plus Contents.json.
                  </span>
                </button>
                <button
                  type="button"
                  aria-pressed={platforms.includes("expo-android")}
                  onClick={() => togglePlatform("expo-android")}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-colors",
                    platforms.includes("expo-android")
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <RiAndroidLine className="size-6" aria-hidden />
                  <span className="mt-3 block font-medium">Expo + Android</span>
                  <span className="text-muted-foreground mt-1 block text-xs leading-relaxed">
                    Standard and adaptive 1024px PNGs with an app.json config
                    snippet.
                  </span>
                </button>
              </div>
            </section>

            <section className="space-y-5">
              <h2 className="text-lg font-semibold">Presentation</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="icon-background">Background colour</Label>
                  <div className="flex gap-2">
                    <input
                      id="icon-background"
                      type="color"
                      value={backgroundColor}
                      onChange={(event) =>
                        setBackgroundColor(event.target.value)
                      }
                      className="h-9 w-12 cursor-pointer rounded border"
                    />
                    <Input
                      value={backgroundColor}
                      onChange={(event) =>
                        setBackgroundColor(event.target.value)
                      }
                      className="font-mono"
                    />
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Also used behind the Android adaptive icon.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="icon-padding">Standard icon padding</Label>
                    <span className="text-muted-foreground text-xs">
                      {iconPadding}%
                    </span>
                  </div>
                  <input
                    id="icon-padding"
                    type="range"
                    min="0"
                    max="35"
                    value={iconPadding}
                    onChange={(event) =>
                      setIconPadding(Number(event.target.value))
                    }
                    className="accent-primary w-full"
                  />
                  <p className="text-muted-foreground text-xs">
                    Leave at 0% when the source is already a finished square
                    icon.
                  </p>
                </div>
              </div>

              {platforms.includes("expo-android") && (
                <div className="max-w-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="adaptive-padding">
                      Adaptive foreground padding
                    </Label>
                    <span className="text-muted-foreground text-xs">
                      {adaptivePadding}%
                    </span>
                  </div>
                  <input
                    id="adaptive-padding"
                    type="range"
                    min="0"
                    max="35"
                    value={adaptivePadding}
                    onChange={(event) =>
                      setAdaptivePadding(Number(event.target.value))
                    }
                    className="accent-primary w-full"
                  />
                  <p className="text-muted-foreground text-xs">
                    Keeps the foreground artwork inside Android’s adaptive mask
                    safe area. The exported foreground stays transparent.
                  </p>
                </div>
              )}
            </section>
          </div>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="bg-muted flex aspect-square items-center justify-center rounded-xl p-5">
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Generated app icon preview"
                    className="size-full rounded-[22%] shadow-lg"
                  />
                )}
              </div>
              <div className="text-muted-foreground space-y-1 text-xs">
                {platforms.includes("ios") && (
                  <p>iOS: 18 PNGs + asset catalogue metadata</p>
                )}
                {platforms.includes("expo-android") && (
                  <p>Expo: standard + adaptive Android icons</p>
                )}
              </div>
              <Button
                className="w-full"
                onClick={handleGenerate}
                disabled={generating || platforms.length === 0}
              >
                {generating ? "Building bundle…" : "Build icon bundle"}
              </Button>
              {zipBlob && (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={handleDownload}
                >
                  <RiDownload2Line data-icon="inline-start" />
                  Download ZIP
                </Button>
              )}
              <ImageToolHandoff
                getArtifact={getSourceArtifact}
                destinations={[
                  {
                    label: "Favicon Generator",
                    href: "/tools/favicon-generator",
                  },
                  {
                    label: "Chrome Extension Icons",
                    href: "/tools/chrome-extension-icons",
                  },
                ]}
              />
              {platforms.length === 0 && (
                <p className="text-center text-xs text-destructive">
                  Choose at least one output.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
