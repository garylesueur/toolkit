"use client";

import {
  RiAddLine,
  RiCheckLine,
  RiDeleteBin6Line,
  RiFileCopyLine,
} from "@remixicon/react";
import { useMemo, useState } from "react";

import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildBoxShadow, buildGradient } from "@/lib/css/builders";
import type { GradientStop } from "@/lib/css/builders";

type Mode = "gradient" | "shadow";
type EditableStop = GradientStop & { id: number };

export default function CssBuildersPage() {
  const [mode, setMode] = useState<Mode>("gradient");
  const [gradientType, setGradientType] = useState<"linear" | "radial">(
    "linear",
  );
  const [angle, setAngle] = useState(135);
  const [radialShape, setRadialShape] = useState<"circle" | "ellipse">(
    "ellipse",
  );
  const [stops, setStops] = useState<EditableStop[]>([
    { color: "#7c3aed", id: 0, position: 0 },
    { color: "#2563eb", id: 1, position: 50 },
    { color: "#06b6d4", id: 2, position: 100 },
  ]);
  const [nextStopId, setNextStopId] = useState(3);
  const [shadowX, setShadowX] = useState(0);
  const [shadowY, setShadowY] = useState(18);
  const [shadowBlur, setShadowBlur] = useState(40);
  const [shadowSpread, setShadowSpread] = useState(-12);
  const [shadowColor, setShadowColor] = useState("#0f172a");
  const [shadowOpacity, setShadowOpacity] = useState(0.35);
  const [shadowInset, setShadowInset] = useState(false);
  const [copied, setCopied] = useState(false);

  const gradient = useMemo(
    () =>
      buildGradient({
        angle,
        radialShape,
        stops,
        type: gradientType,
      }),
    [angle, gradientType, radialShape, stops],
  );
  const shadow = useMemo(
    () =>
      buildBoxShadow({
        blur: shadowBlur,
        color: shadowColor,
        inset: shadowInset,
        opacity: shadowOpacity,
        spread: shadowSpread,
        x: shadowX,
        y: shadowY,
      }),
    [
      shadowBlur,
      shadowColor,
      shadowInset,
      shadowOpacity,
      shadowSpread,
      shadowX,
      shadowY,
    ],
  );
  const declaration =
    mode === "gradient" ? `background: ${gradient};` : `box-shadow: ${shadow};`;

  const updateStop = (id: number, update: Partial<GradientStop>) => {
    setStops((current) =>
      current.map((stop) => (stop.id === id ? { ...stop, ...update } : stop)),
    );
  };

  const addStop = () => {
    setStops((current) => [
      ...current,
      { color: "#ffffff", id: nextStopId, position: 50 },
    ]);
    setNextStopId((current) => current + 1);
  };

  const copyCss = async () => {
    await navigator.clipboard.writeText(declaration);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        CSS Gradient & Box Shadow Builders
      </h1>
      <p className="mt-1 text-muted-foreground">
        Design visual effects with live previews and copy-ready CSS.
      </p>
      <PrivacyBanner>
        The preview and CSS are generated entirely in this browser.
      </PrivacyBanner>

      <section className="mt-8 flex gap-2">
        <Button
          variant={mode === "gradient" ? "default" : "outline"}
          onClick={() => setMode("gradient")}
        >
          Gradient
        </Button>
        <Button
          variant={mode === "shadow" ? "default" : "outline"}
          onClick={() => setMode("shadow")}
        >
          Box shadow
        </Button>
      </section>

      <section className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
        <div>
          {mode === "gradient" ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="space-y-1 text-xs font-medium">
                  Gradient type
                  <select
                    className="block h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={gradientType}
                    onChange={(event) =>
                      setGradientType(event.target.value as "linear" | "radial")
                    }
                  >
                    <option value="linear">Linear</option>
                    <option value="radial">Radial</option>
                  </select>
                </label>
                {gradientType === "linear" ? (
                  <RangeControl
                    label="Angle"
                    value={angle}
                    min={0}
                    max={359}
                    suffix="°"
                    onChange={setAngle}
                  />
                ) : (
                  <label className="space-y-1 text-xs font-medium">
                    Shape
                    <select
                      className="block h-9 w-full rounded-md border bg-background px-3 text-sm"
                      value={radialShape}
                      onChange={(event) =>
                        setRadialShape(
                          event.target.value as "circle" | "ellipse",
                        )
                      }
                    >
                      <option value="ellipse">Ellipse</option>
                      <option value="circle">Circle</option>
                    </select>
                  </label>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold">Colour stops</h2>
                  <Button size="sm" variant="outline" onClick={addStop}>
                    <RiAddLine className="size-4" />
                    Add stop
                  </Button>
                </div>
                <div className="mt-3 space-y-2">
                  {stops.map((stop) => (
                    <div
                      key={stop.id}
                      className="grid grid-cols-[auto_1fr_5rem_auto] items-center gap-3 rounded-lg border p-3"
                    >
                      <input
                        type="color"
                        aria-label={`Stop colour ${stop.id + 1}`}
                        value={stop.color}
                        onChange={(event) =>
                          updateStop(stop.id, { color: event.target.value })
                        }
                        className="size-9 cursor-pointer rounded border bg-transparent"
                      />
                      <input
                        type="range"
                        aria-label={`Stop position ${stop.id + 1}`}
                        min={0}
                        max={100}
                        value={stop.position}
                        onChange={(event) =>
                          updateStop(stop.id, {
                            position: Number(event.target.value),
                          })
                        }
                      />
                      <Input
                        type="number"
                        aria-label={`Stop percentage ${stop.id + 1}`}
                        min={0}
                        max={100}
                        value={stop.position}
                        onChange={(event) =>
                          updateStop(stop.id, {
                            position: Number(event.target.value),
                          })
                        }
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={stops.length <= 2}
                        aria-label={`Remove stop ${stop.id + 1}`}
                        onClick={() =>
                          setStops((current) =>
                            current.filter((item) => item.id !== stop.id),
                          )
                        }
                      >
                        <RiDeleteBin6Line className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              <RangeControl
                label="Horizontal offset"
                value={shadowX}
                min={-100}
                max={100}
                suffix="px"
                onChange={setShadowX}
              />
              <RangeControl
                label="Vertical offset"
                value={shadowY}
                min={-100}
                max={100}
                suffix="px"
                onChange={setShadowY}
              />
              <RangeControl
                label="Blur"
                value={shadowBlur}
                min={0}
                max={120}
                suffix="px"
                onChange={setShadowBlur}
              />
              <RangeControl
                label="Spread"
                value={shadowSpread}
                min={-60}
                max={60}
                suffix="px"
                onChange={setShadowSpread}
              />
              <RangeControl
                label="Opacity"
                value={shadowOpacity}
                min={0}
                max={1}
                step={0.01}
                onChange={setShadowOpacity}
              />
              <label className="space-y-1 text-xs font-medium">
                Shadow colour
                <span className="flex items-center gap-3">
                  <input
                    type="color"
                    aria-label="Shadow colour"
                    value={shadowColor}
                    onChange={(event) => setShadowColor(event.target.value)}
                    className="size-9 cursor-pointer rounded border bg-transparent"
                  />
                  <code>{shadowColor}</code>
                </span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={shadowInset}
                  onChange={(event) => setShadowInset(event.target.checked)}
                />
                Inset shadow
              </label>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="font-semibold">Live preview</h2>
          <div className="flex min-h-72 items-center justify-center overflow-hidden rounded-xl border bg-[linear-gradient(45deg,var(--muted)_25%,transparent_25%,transparent_75%,var(--muted)_75%),linear-gradient(45deg,var(--muted)_25%,transparent_25%,transparent_75%,var(--muted)_75%)] bg-[length:24px_24px] bg-[position:0_0,12px_12px] p-10">
            {mode === "gradient" ? (
              <div
                aria-label="Gradient preview"
                className="h-48 w-full rounded-xl border"
                style={{ background: gradient }}
              />
            ) : (
              <div
                aria-label="Box shadow preview"
                className="h-40 w-52 rounded-xl bg-background"
                style={{ boxShadow: shadow }}
              />
            )}
          </div>
          <div className="overflow-hidden rounded-lg border">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-2">
              <h3 className="text-sm font-medium">Generated CSS</h3>
              <Button size="sm" variant="ghost" onClick={copyCss}>
                {copied ? (
                  <RiCheckLine className="size-4" />
                ) : (
                  <RiFileCopyLine className="size-4" />
                )}
                {copied ? "Copied" : "Copy CSS"}
              </Button>
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap break-all p-4 font-mono text-xs">
              {declaration}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}

type RangeControlProps = {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step?: number;
  suffix?: string;
  value: number;
};

function RangeControl({
  label,
  max,
  min,
  onChange,
  step = 1,
  suffix = "",
  value,
}: RangeControlProps) {
  return (
    <label className="space-y-1 text-xs font-medium">
      <span className="flex justify-between gap-3">
        {label}
        <output>
          {value}
          {suffix}
        </output>
      </span>
      <input
        type="range"
        aria-label={label}
        className="block w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
