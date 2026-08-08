"use client";

import {
  RiDownload2Line,
  RiLoader4Line,
  RiShieldCheckLine,
  RiUpload2Line,
} from "@remixicon/react";
import { useEffect, useMemo, useState } from "react";

import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { inspectImageMetadata } from "@/lib/image/metadata";
import type { ImageMetadataReport } from "@/lib/image/metadata";
import { imageTypeForFile, scrubImageMetadata } from "@/lib/image/scrub";

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ImageMetadataScrubberPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [report, setReport] = useState<ImageMetadataReport | null>(null);
  const [quality, setQuality] = useState(92);
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; fileName: string } | null>(
    null,
  );
  const [resultPreview, setResultPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sensitiveCount = useMemo(
    () =>
      report?.fields.filter((field) =>
        ["device", "location", "time", "author"].includes(field.category),
      ).length ?? 0,
    [report],
  );

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
      if (resultPreview) URL.revokeObjectURL(resultPreview);
    },
    [preview, resultPreview],
  );

  const chooseFile = async (chosen: File | null) => {
    if (preview) URL.revokeObjectURL(preview);
    if (resultPreview) URL.revokeObjectURL(resultPreview);
    setFile(chosen);
    setPreview(chosen ? URL.createObjectURL(chosen) : null);
    setResult(null);
    setResultPreview(null);
    setReport(null);
    setError(null);
    if (!chosen) return;
    try {
      imageTypeForFile(chosen);
      setReport(
        inspectImageMetadata(new Uint8Array(await chosen.arrayBuffer())),
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not inspect this image.",
      );
    }
  };

  const scrub = async () => {
    if (!file) return;
    setWorking(true);
    setResult(null);
    setError(null);
    if (resultPreview) URL.revokeObjectURL(resultPreview);
    setResultPreview(null);
    try {
      const output = await scrubImageMetadata(file, quality / 100);
      setResult(output);
      setResultPreview(URL.createObjectURL(output.blob));
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not remove metadata from this image.",
      );
    } finally {
      setWorking(false);
    }
  };

  const download = () => {
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = result.fileName;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        Image Metadata Viewer & Scrubber
      </h1>
      <p className="mt-1 text-muted-foreground">
        Inspect privacy-sensitive image metadata, then remove it locally.
      </p>
      <PrivacyBanner>
        Your image is inspected and re-encoded entirely in your browser. Nothing
        is uploaded or sent to a server.
      </PrivacyBanner>
      <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        Scrubbing re-encodes pixels. JPEG and WebP quality may change, colour
        profiles are removed, and unusual colour or transparency behaviour can
        differ. Keep the original until you check the downloaded copy.
      </div>

      <div className="mt-8">
        <Label
          htmlFor="metadata-image"
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center"
        >
          <RiUpload2Line className="mb-2 size-7 text-muted-foreground" />
          <span className="font-medium">
            {file ? file.name : "Choose a JPEG, PNG, or WebP image"}
          </span>
          <span className="mt-1 text-sm text-muted-foreground">
            {file ? formatBytes(file.size) : "Metadata stays on this device"}
          </span>
        </Label>
        <input
          id="metadata-image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => void chooseFile(event.target.files?.[0] ?? null)}
        />
      </div>
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {file && preview && report && (
        <div className="mt-6 space-y-6">
          <div className="grid gap-5 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div className="rounded-lg border p-4">
              <img
                src={preview}
                alt="Original preview"
                className="mx-auto max-h-80 max-w-full rounded object-contain"
              />
              <p className="mt-3 text-center text-sm text-muted-foreground">
                {report.format} · {formatBytes(file.size)}
              </p>
            </div>
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <p className="text-2xl font-semibold">
                    {report.metadataBlocks.length}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Metadata block types
                  </p>
                </div>
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                  <p className="text-2xl font-semibold">{sensitiveCount}</p>
                  <p className="text-sm text-muted-foreground">
                    Privacy-related fields
                  </p>
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <h2 className="font-medium">Detected blocks</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {report.metadataBlocks.length
                    ? report.metadataBlocks.join(" · ")
                    : "No recognised metadata blocks found."}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <h2 className="font-medium">Readable fields</h2>
                {report.fields.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No supported readable fields found. Unknown metadata can
                    still exist, so re-encoding is useful before sharing.
                  </p>
                ) : (
                  <dl className="mt-2">
                    {report.fields.map((field, index) => (
                      <div
                        key={`${field.label}-${index}`}
                        className="grid gap-1 border-t py-2 first:border-t-0 sm:grid-cols-[10rem_1fr]"
                      >
                        <dt className="text-sm text-muted-foreground">
                          {field.label}
                        </dt>
                        <dd className="break-all text-sm">{field.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </div>
          </div>

          {file.type !== "image/png" && (
            <div className="rounded-lg border p-4">
              <Label htmlFor="scrub-quality">Output quality ({quality}%)</Label>
              <input
                id="scrub-quality"
                type="range"
                min={60}
                max={100}
                value={quality}
                onChange={(event) => {
                  setQuality(Number(event.target.value));
                  setResult(null);
                }}
                className="mt-2 w-full accent-primary"
              />
            </div>
          )}

          <Button disabled={working} onClick={scrub}>
            {working ? (
              <RiLoader4Line className="size-4 animate-spin" />
            ) : (
              <RiShieldCheckLine className="size-4" />
            )}
            {working ? "Removing metadata…" : "Remove metadata"}
          </Button>

          {result && resultPreview && (
            <div className="grid gap-4 rounded-lg border border-green-500/30 bg-green-500/5 p-4 sm:grid-cols-[8rem_1fr_auto] sm:items-center">
              <img
                src={resultPreview}
                alt="Scrubbed preview"
                className="max-h-28 max-w-full rounded object-contain"
              />
              <div>
                <p className="font-medium">Metadata-removed image is ready</p>
                <p className="text-sm text-muted-foreground">
                  {formatBytes(file.size)} → {formatBytes(result.blob.size)} ·
                  Check the preview before sharing.
                </p>
              </div>
              <Button onClick={download}>
                <RiDownload2Line className="size-4" />
                Download
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
