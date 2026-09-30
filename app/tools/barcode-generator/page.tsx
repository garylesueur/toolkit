"use client";

import { RiDownload2Line } from "@remixicon/react";
import JsBarcode from "jsbarcode";
import { useEffect, useMemo, useRef, useState } from "react";

import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  normaliseBarcodeValue,
  type BarcodeKind,
} from "@/lib/barcode/generate";

const FORMATS: { value: BarcodeKind; label: string; example: string }[] = [
  { value: "CODE128", label: "Code 128", example: "Order-12345" },
  { value: "EAN13", label: "EAN-13", example: "400638133393" },
  { value: "EAN8", label: "EAN-8", example: "9638507" },
  { value: "UPC", label: "UPC-A", example: "03600029145" },
  { value: "CODE39", label: "Code 39", example: "STOCK-42" },
  { value: "ITF14", label: "ITF-14", example: "1001234500001" },
  { value: "codabar", label: "Codabar", example: "1234-56/7" },
];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function serialiseSvg(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  return new XMLSerializer().serializeToString(clone);
}

function boundedInput(value: string, minimum: number, maximum: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return minimum;
  return Math.min(maximum, Math.max(minimum, Math.round(parsed)));
}

export default function BarcodeGeneratorPage() {
  const [format, setFormat] = useState<BarcodeKind>("CODE128");
  const [value, setValue] = useState("Order-12345");
  const [barWidth, setBarWidth] = useState(2);
  const [height, setHeight] = useState(100);
  const [showText, setShowText] = useState(true);
  const [lineColour, setLineColour] = useState("#111827");
  const [background, setBackground] = useState("#ffffff");
  const svgRef = useRef<SVGSVGElement>(null);

  const result = useMemo(() => {
    try {
      return { barcode: normaliseBarcodeValue(value, format), error: null };
    } catch (error) {
      return {
        barcode: null,
        error: error instanceof Error ? error.message : "Invalid barcode value",
      };
    }
  }, [format, value]);

  useEffect(() => {
    if (!svgRef.current || !result.barcode) return;

    JsBarcode(svgRef.current, result.barcode.value, {
      format,
      width: barWidth,
      height,
      displayValue: showText,
      lineColor: lineColour,
      background,
      margin: 16,
      font: "ui-monospace, SFMono-Regular, Menlo, monospace",
    });
  }, [
    background,
    barWidth,
    format,
    height,
    lineColour,
    result.barcode,
    showText,
  ]);

  function chooseFormat(nextFormat: BarcodeKind) {
    const option = FORMATS.find((item) => item.value === nextFormat);
    setFormat(nextFormat);
    setValue(option?.example ?? "");
  }

  function downloadSvg() {
    if (!svgRef.current || !result.barcode) return;
    downloadBlob(
      new Blob([serialiseSvg(svgRef.current)], { type: "image/svg+xml" }),
      `${format.toLowerCase()}-barcode.svg`,
    );
  }

  function downloadPng() {
    if (!svgRef.current || !result.barcode) return;
    const svg = serialiseSvg(svgRef.current);
    const image = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(image.width * 2);
      canvas.height = Math.ceil(image.height * 2);
      const context = canvas.getContext("2d");
      context?.scale(2, 2);
      context?.drawImage(image, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (blob) downloadBlob(blob, `${format.toLowerCase()}-barcode.png`);
      }, "image/png");
    };
    image.src = url;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Barcode Generator</h1>
      <p className="text-muted-foreground mt-1">
        Create print-ready retail, inventory, and logistics barcodes as SVG or
        PNG.
      </p>
      <PrivacyBanner>
        Your barcode is validated and generated entirely in your browser.
        Nothing is uploaded.
      </PrivacyBanner>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="barcode-format">Format</Label>
            <select
              id="barcode-format"
              value={format}
              onChange={(event) =>
                chooseFormat(event.target.value as BarcodeKind)
              }
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            >
              {FORMATS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="barcode-value">Value</Label>
            <Input
              id="barcode-value"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="font-mono"
              spellCheck={false}
            />
            {result.error ? (
              <p className="text-sm text-destructive" role="alert">
                {result.error}
              </p>
            ) : result.barcode?.checkDigit ? (
              <p className="text-muted-foreground text-xs">
                Check digit: {result.barcode.checkDigit} · Encoded value:{" "}
                <code>{result.barcode.value}</code>
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bar-width">Bar width</Label>
              <Input
                id="bar-width"
                type="number"
                min={1}
                max={4}
                value={barWidth}
                onChange={(event) =>
                  setBarWidth(boundedInput(event.target.value, 1, 4))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bar-height">Bar height</Label>
              <Input
                id="bar-height"
                type="number"
                min={40}
                max={200}
                value={height}
                onChange={(event) =>
                  setHeight(boundedInput(event.target.value, 40, 200))
                }
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={showText}
              onChange={(event) => setShowText(event.target.checked)}
            />
            Show human-readable value
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="space-y-2 text-sm font-medium">
              Bar colour
              <input
                type="color"
                value={lineColour}
                onChange={(event) => setLineColour(event.target.value)}
                className="mt-2 block h-10 w-full"
              />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Background
              <input
                type="color"
                value={background}
                onChange={(event) => setBackground(event.target.value)}
                className="mt-2 block h-10 w-full"
              />
            </label>
          </div>
        </div>

        <section>
          <h2 className="font-semibold">Live preview</h2>
          <div className="mt-3 flex min-h-64 items-center justify-center overflow-auto rounded-xl border bg-white p-4">
            {result.barcode ? (
              <svg ref={svgRef} aria-label={`${format} barcode preview`} />
            ) : (
              <p className="text-sm text-slate-500">
                Enter a valid value to preview
              </p>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={downloadSvg}
              disabled={!result.barcode}
            >
              <RiDownload2Line /> Download SVG
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={downloadPng}
              disabled={!result.barcode}
            >
              <RiDownload2Line /> Download PNG
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
