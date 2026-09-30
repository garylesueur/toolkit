"use client";

import {
  RiCameraLine,
  RiFileCopyLine,
  RiImageAddLine,
  RiLoader4Line,
  RiStopCircleLine,
} from "@remixicon/react";
import type { IScannerControls } from "@zxing/browser";
import { BarcodeFormat } from "@zxing/library";
import { useEffect, useRef, useState } from "react";

import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import {
  classifyBarcodeContent,
  friendlyBarcodeFormat,
} from "@/lib/security/barcode-content";
import type { DecodedBarcodeContent } from "@/lib/security/barcode-content";

const MAX_IMAGE_SIZE = 15 * 1024 * 1024;

type ScanResult = {
  content: DecodedBarcodeContent;
  format: string;
};

export default function BarcodeReaderPage() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const [copied, setCopied] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  const stopCamera = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  };

  useEffect(() => stopCamera, []);

  const showResult = (text: string, format: number) => {
    setResult({
      content: classifyBarcodeContent(text),
      format: friendlyBarcodeFormat(BarcodeFormat[format] ?? "Unknown"),
    });
    setError(null);
  };

  const scanImage = async (file: File | undefined) => {
    if (!file) return;
    stopCamera();
    setResult(null);
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError(
        "Choose a PNG, JPEG, WebP, GIF, or other browser-readable image.",
      );
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setError("Images must be 15 MB or smaller.");
      return;
    }
    setLoadingImage(true);
    const objectUrl = URL.createObjectURL(file);
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const decoded = await new BrowserMultiFormatReader().decodeFromImageUrl(
        objectUrl,
      );
      showResult(decoded.getText(), decoded.getBarcodeFormat());
    } catch {
      setError(
        "No supported QR code or barcode was found. Try a sharper, uncropped image with good contrast.",
      );
    } finally {
      URL.revokeObjectURL(objectUrl);
      setLoadingImage(false);
    }
  };

  const scanExample = async () => {
    stopCamera();
    setResult(null);
    setError(null);
    setLoadingImage(true);
    try {
      const [{ BrowserMultiFormatReader }, QRCode] = await Promise.all([
        import("@zxing/browser"),
        import("qrcode"),
      ]);
      const dataUrl = await QRCode.toDataURL(
        "https://example.com/docs?source=qr-example",
        { margin: 4, width: 480 },
      );
      const decoded = await new BrowserMultiFormatReader().decodeFromImageUrl(
        dataUrl,
      );
      showResult(decoded.getText(), decoded.getBarcodeFormat());
    } catch {
      setError("The example QR code could not be decoded in this browser.");
    } finally {
      setLoadingImage(false);
    }
  };

  const startCamera = async () => {
    if (!videoRef.current) return;
    stopCamera();
    setResult(null);
    setError(null);
    setScanning(true);
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      controlsRef.current = await reader.decodeFromConstraints(
        { audio: false, video: { facingMode: { ideal: "environment" } } },
        videoRef.current,
        (decoded) => {
          if (!decoded) return;
          showResult(decoded.getText(), decoded.getBarcodeFormat());
          controlsRef.current?.stop();
          controlsRef.current = null;
          setScanning(false);
        },
      );
    } catch {
      stopCamera();
      setError(
        "The camera could not be started. Check browser permission, use HTTPS, or choose an image instead.",
      );
    }
  };

  const copyResult = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.content.text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">QR & Barcode Reader</h1>
      <p className="mt-1 text-muted-foreground">
        Decode QR codes and common 1D/2D barcodes from an image or camera.
      </p>
      <PrivacyBanner>
        Images and camera frames are decoded locally in your browser. They are
        never uploaded, and decoded URLs are not opened automatically.
      </PrivacyBanner>
      <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        A QR code can hide a misleading or harmful destination. Always inspect
        the decoded hostname and context before opening a link or acting on its
        contents.
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-5">
          <RiImageAddLine className="size-6 text-primary" />
          <h2 className="mt-3 font-semibold">Choose an image</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Best for screenshots, saved codes, and product barcodes.
          </p>
          <Button className="mt-4" variant="outline" asChild>
            <label>
              {loadingImage ? (
                <RiLoader4Line className="size-4 animate-spin" />
              ) : (
                <RiImageAddLine className="size-4" />
              )}
              {loadingImage ? "Scanning…" : "Select image"}
              <input
                type="file"
                className="sr-only"
                accept="image/*"
                disabled={loadingImage}
                onChange={(event) => scanImage(event.target.files?.[0])}
              />
            </label>
          </Button>
          <Button
            className="mt-4 ml-2"
            variant="ghost"
            disabled={loadingImage}
            onClick={scanExample}
          >
            Try example QR
          </Button>
        </div>

        <div className="rounded-lg border p-5">
          <RiCameraLine className="size-6 text-primary" />
          <h2 className="mt-3 font-semibold">Use your camera</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Permission is requested only when you start scanning.
          </p>
          {scanning ? (
            <Button className="mt-4" variant="outline" onClick={stopCamera}>
              <RiStopCircleLine className="size-4" />
              Stop camera
            </Button>
          ) : (
            <Button className="mt-4" variant="outline" onClick={startCamera}>
              <RiCameraLine className="size-4" />
              Start camera
            </Button>
          )}
        </div>
      </section>

      <div
        className={`mt-4 overflow-hidden rounded-lg bg-black ${scanning ? "block" : "hidden"}`}
      >
        <video
          ref={videoRef}
          className="max-h-96 w-full object-contain"
          muted
          playsInline
        />
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {result && (
        <section className="mt-8 overflow-hidden rounded-lg border">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
            <div>
              <p className="text-xs text-muted-foreground">{result.format}</p>
              <h2 className="font-semibold">{result.content.kind}</h2>
            </div>
            <Button size="sm" variant="outline" onClick={copyResult}>
              <RiFileCopyLine className="size-4" />
              {copied ? "Copied" : "Copy value"}
            </Button>
          </header>
          <div className="space-y-4 p-4">
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-4 text-sm">
              {result.content.text || "(empty value)"}
            </pre>
            {result.content.warning && (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                {result.content.warning}
              </p>
            )}
            {result.content.openableUrl && (
              <Button asChild>
                <a
                  href={result.content.openableUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open this exact URL in a new tab
                </a>
              </Button>
            )}
          </div>
        </section>
      )}

      <section className="mt-8 text-sm text-muted-foreground">
        <h2 className="font-semibold text-foreground">Supported formats</h2>
        <p className="mt-1">
          QR Code, Data Matrix, Aztec, PDF417, Codabar, Code 39, Code 93, Code
          128, EAN-8, EAN-13, ITF, RSS, UPC-A, and UPC-E.
        </p>
      </section>
    </div>
  );
}
