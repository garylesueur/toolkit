"use client";

import { RiDownload2Line, RiLoopLeftLine } from "@remixicon/react";
import { useState, useMemo, useEffect, useCallback } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COLOR_PRESETS,
  FONT_OPTIONS,
  TEXT_COLOR_SWATCHES,
} from "@/lib/logo-generator/presets";
import {
  downloadIco,
  downloadPng,
  downloadSvg,
  downloadZipBundle,
} from "@/lib/logo-generator/export";
import {
  generateLogoSvg,
  generateIconLogoSvg,
  googleFontUrl,
} from "@/lib/logo-generator/svg";
import { ICON_ENTRIES } from "@/lib/logo-generator/icons";
import type {
  ColorPreset,
  FontOption,
  GradientDirection,
} from "@/lib/logo-generator/types";
import {
  DEFAULT_LOGO_SETTINGS,
  LOGO_STATE_VERSION,
  resolveFont,
  resolvePreset,
} from "@/lib/logo-generator/state";
import type { LogoGeneratorSettings } from "@/lib/logo-generator/state";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { cn } from "@/lib/utils";

const RADIUS_OPTIONS = [
  { label: "Sharp", value: 0 },
  { label: "Rounded", value: 48 },
  { label: "Circle", value: 256 },
] as const;

const DIRECTION_OPTIONS: { label: string; value: GradientDirection }[] = [
  { label: "\u2198", value: "to-br" },
  { label: "\u2193", value: "to-b" },
  { label: "\u2192", value: "to-r" },
  { label: "\u2199", value: "to-bl" },
];

const TEXT_SIZE_MIN = 30;
const TEXT_SIZE_MAX = 200;

const PADDING_MIN = -80;
const PADDING_MAX = 120;

const HORIZONTAL_MIN = -200;
const HORIZONTAL_MAX = 200;

const ICON_SIZE_MIN = 30;
const ICON_SIZE_MAX = 200;

/** Track which Google Font stylesheets have been injected */
const loadedFonts = new Set<string>();

function ensureFontLoaded(font: FontOption) {
  if (loadedFonts.has(font.googleFamily)) return;
  loadedFonts.add(font.googleFamily);

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = googleFontUrl(font.googleFamily);
  document.head.appendChild(link);
}

function filterIcons(query: string) {
  if (!query) return ICON_ENTRIES;
  const lower = query.toLowerCase();
  return ICON_ENTRIES.filter(
    (icon) =>
      icon.name.toLowerCase().includes(lower) ||
      icon.keywords.some((kw) => kw.includes(lower)),
  );
}

export default function LogoGeneratorPage() {
  const [settings, setSettings] = usePersistedState<LogoGeneratorSettings>(
    "toolkit:logo-generator",
    LOGO_STATE_VERSION,
    DEFAULT_LOGO_SETTINGS,
  );
  const [exporting, setExporting] = useState(false);
  const [iconSearch, setIconSearch] = useState("");

  const set = useCallback(
    <K extends keyof LogoGeneratorSettings>(
      key: K,
      value: LogoGeneratorSettings[K],
    ) => setSettings((prev) => ({ ...prev, [key]: value })),
    [setSettings],
  );

  // Resolve full objects from persisted names
  const font = resolveFont(settings.fontName);
  const preset = resolvePreset(settings.presetName);

  // Load the selected Google Font stylesheet
  useEffect(() => {
    if (settings.mode === "letters") {
      ensureFontLoaded(font);
    }
  }, [font, settings.mode]);

  const isLettersMode = settings.mode === "letters";

  const svgString = useMemo(() => {
    if (isLettersMode) {
      return generateLogoSvg({
        letters: settings.letters,
        preset,
        useCustomColors: settings.bgMode !== "preset",
        customColor1: settings.customColor1,
        customColor2:
          settings.bgMode === "gradient"
            ? settings.customColor2
            : settings.customColor1,
        customDirection: settings.customDirection,
        borderRadius: settings.borderRadius,
        font,
        textSize: settings.textSize,
        bottomPadding: settings.bottomPadding,
        horizontalOffset: settings.horizontalOffset,
        textColor: settings.textColor,
      });
    }
    return generateIconLogoSvg({
      iconName: settings.iconName,
      iconVariant: settings.iconVariant,
      iconSize: settings.iconSize,
      iconPadding: settings.iconPadding,
      iconColor: settings.iconColor,
      preset,
      useCustomColors: settings.bgMode !== "preset",
      customColor1: settings.customColor1,
      customColor2:
        settings.bgMode === "gradient"
          ? settings.customColor2
          : settings.customColor1,
      customDirection: settings.customDirection,
      borderRadius: settings.borderRadius,
    });
  }, [settings, font, preset, isLettersMode]);

  const exportPrefix = isLettersMode
    ? settings.letters
    : settings.iconName.toLowerCase();

  const canExport = isLettersMode ? settings.letters.length > 0 : !!settings.iconName;

  const handleDownloadSvg = useCallback(() => {
    downloadSvg(svgString, exportPrefix);
  }, [svgString, exportPrefix]);

  const handleDownloadPng = useCallback(
    async (size: number) => {
      setExporting(true);
      try {
        await downloadPng(svgString, size, exportPrefix);
      } finally {
        setExporting(false);
      }
    },
    [svgString, exportPrefix],
  );

  const handleDownloadIco = useCallback(async () => {
    setExporting(true);
    try {
      await downloadIco(svgString, exportPrefix);
    } finally {
      setExporting(false);
    }
  }, [svgString, exportPrefix]);

  const handleDownloadZip = useCallback(async () => {
    setExporting(true);
    try {
      await downloadZipBundle(svgString, exportPrefix);
    } finally {
      setExporting(false);
    }
  }, [svgString, exportPrefix]);

  function handleLettersChange(value: string) {
    const cleaned = value
      .toLowerCase()
      .replace(/[^a-z]/g, "")
      .slice(0, 3);
    set("letters", cleaned);
  }

  function handlePresetClick(p: ColorPreset) {
    setSettings((prev) => ({
      ...prev,
      presetName: p.name,
      bgMode: "preset",
    }));
  }

  function handleFontChange(fontName: string) {
    const selected = FONT_OPTIONS.find((f) => f.name === fontName);
    if (selected) set("fontName", selected.name);
  }

  const filteredIcons = useMemo(() => filterIcons(iconSearch), [iconSearch]);

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quick Logo Generator</h1>
          <p className="text-muted-foreground mt-1">
            Type a few letters or pick an icon to get a clean branded logo for
            your project.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSettings(DEFAULT_LOGO_SETTINGS)}
          title="Reset to defaults"
          aria-label="Reset to defaults"
        >
          <RiLoopLeftLine className="mr-1.5 h-4 w-4" aria-hidden />
          Reset
        </Button>
      </div>

      <div className="grid gap-8 md:grid-cols-[1fr_auto]">
        {/* Controls */}
        <div className="space-y-6">
          {/* Mode switcher */}
          <div className="space-y-2">
            <Label>Mode</Label>
            <div className="flex gap-2">
              <Button
                variant={isLettersMode ? "default" : "outline"}
                size="sm"
                onClick={() => set("mode", "letters")}
              >
                Letters
              </Button>
              <Button
                variant={!isLettersMode ? "default" : "outline"}
                size="sm"
                onClick={() => set("mode", "icon")}
              >
                Icon
              </Button>
            </div>
          </div>

          {/* Letters-mode controls */}
          {isLettersMode && (
            <>
              {/* Letters input */}
              <div className="space-y-2">
                <Label htmlFor="letters">Letters (1-3)</Label>
                <Input
                  id="letters"
                  value={settings.letters}
                  onChange={(e) => handleLettersChange(e.target.value)}
                  placeholder="fb"
                  maxLength={3}
                  className="max-w-32 text-lg font-bold lowercase"
                />
              </div>

              {/* Font selector */}
              <div className="space-y-2">
                <Label>Font</Label>
                <Select value={font.name} onValueChange={handleFontChange}>
                  <SelectTrigger className="max-w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((f) => (
                      <SelectItem key={f.name} value={f.name}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Text colour swatches */}
              <div className="space-y-2">
                <Label>Text colour</Label>
                <div className="flex flex-wrap gap-2">
                  {TEXT_COLOR_SWATCHES.map((s) => (
                    <button
                      key={s.name}
                      type="button"
                      title={s.name}
                      aria-label={`${s.name} text colour`}
                      onClick={() =>
                        setSettings((prev) => ({
                          ...prev,
                          textColor: s.color,
                          useCustomTextColor: false,
                        }))
                      }
                      className={`h-9 w-9 rounded-md border-2 transition-all ${
                        !settings.useCustomTextColor &&
                        settings.textColor === s.color
                          ? "ring-primary scale-110 border-transparent ring-2 ring-offset-2"
                          : "border-border hover:scale-105"
                      }`}
                      style={{ background: s.color }}
                    />
                  ))}

                  {/* Custom text colour toggle */}
                  <button
                    type="button"
                    title="Custom text colour"
                    aria-label="Use custom text colour"
                    onClick={() =>
                      set("useCustomTextColor", !settings.useCustomTextColor)
                    }
                    className={`flex h-9 w-9 items-center justify-center rounded-md border-2 text-lg font-bold transition-all ${
                      settings.useCustomTextColor
                        ? "ring-primary scale-110 border-transparent ring-2 ring-offset-2"
                        : "border-border hover:scale-105"
                    }`}
                    style={{
                      background:
                        "conic-gradient(from 0deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
                    }}
                  />
                </div>

                {settings.useCustomTextColor && (
                  <div className="flex gap-2 pt-1">
                    <input
                      type="color"
                      id="text-color"
                      value={settings.textColor}
                      onChange={(e) => set("textColor", e.target.value)}
                      className="h-9 w-12 cursor-pointer rounded border"
                    />
                    <Input
                      value={settings.textColor}
                      onChange={(e) => set("textColor", e.target.value)}
                      className="max-w-28 font-mono text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Text size slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="text-size">Text size</Label>
                  <span className="text-muted-foreground text-sm">
                    {settings.textSize}%
                  </span>
                </div>
                <input
                  id="text-size"
                  type="range"
                  min={TEXT_SIZE_MIN}
                  max={TEXT_SIZE_MAX}
                  value={settings.textSize}
                  onChange={(e) => set("textSize", Number(e.target.value))}
                  className="accent-primary w-full"
                />
              </div>

              {/* Bottom padding slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="bottom-padding">Bottom padding</Label>
                  <span className="text-muted-foreground text-sm">
                    {settings.bottomPadding}px
                  </span>
                </div>
                <input
                  id="bottom-padding"
                  type="range"
                  min={PADDING_MIN}
                  max={PADDING_MAX}
                  value={settings.bottomPadding}
                  onChange={(e) =>
                    set("bottomPadding", Number(e.target.value))
                  }
                  className="accent-primary w-full"
                />
              </div>

              {/* Horizontal position slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="horizontal-offset">
                    Horizontal position
                  </Label>
                  <span className="text-muted-foreground text-sm">
                    {settings.horizontalOffset === 0
                      ? "centre"
                      : `${settings.horizontalOffset > 0 ? "+" : ""}${settings.horizontalOffset}px`}
                  </span>
                </div>
                <input
                  id="horizontal-offset"
                  type="range"
                  min={HORIZONTAL_MIN}
                  max={HORIZONTAL_MAX}
                  value={settings.horizontalOffset}
                  onChange={(e) =>
                    set("horizontalOffset", Number(e.target.value))
                  }
                  className="accent-primary w-full"
                />
              </div>
            </>
          )}

          {/* Icon-mode controls */}
          {!isLettersMode && (
            <>
              {/* Icon picker */}
              <div className="space-y-2">
                <Label>Icon</Label>
                <Input
                  placeholder="Search icons..."
                  value={iconSearch}
                  onChange={(e) => setIconSearch(e.target.value)}
                />
                <div className="grid max-h-48 grid-cols-8 gap-1.5 overflow-y-auto rounded-md border p-2">
                  {filteredIcons.map((icon) => (
                    <button
                      key={icon.name}
                      type="button"
                      title={icon.name}
                      aria-label={`${icon.name} icon`}
                      onClick={() => set("iconName", icon.name)}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-md border-2 transition-all",
                        settings.iconName === icon.name
                          ? "ring-primary scale-110 border-transparent ring-2 ring-offset-2"
                          : "border-border hover:scale-105",
                      )}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="currentColor"
                      >
                        <path d={icon.linePath} />
                      </svg>
                    </button>
                  ))}
                  {filteredIcons.length === 0 && (
                    <p className="text-muted-foreground col-span-8 py-4 text-center text-sm">
                      No icons match &ldquo;{iconSearch}&rdquo;
                    </p>
                  )}
                </div>
              </div>

              {/* Icon style toggle */}
              <div className="space-y-2">
                <Label>Style</Label>
                <div className="flex gap-2">
                  <Button
                    variant={
                      settings.iconVariant === "line" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => set("iconVariant", "line")}
                  >
                    Outline
                  </Button>
                  <Button
                    variant={
                      settings.iconVariant === "fill" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => set("iconVariant", "fill")}
                  >
                    Filled
                  </Button>
                </div>
              </div>

              {/* Icon size slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="icon-size">Icon size</Label>
                  <span className="text-muted-foreground text-sm">
                    {settings.iconSize}%
                  </span>
                </div>
                <input
                  id="icon-size"
                  type="range"
                  min={ICON_SIZE_MIN}
                  max={ICON_SIZE_MAX}
                  value={settings.iconSize}
                  onChange={(e) => set("iconSize", Number(e.target.value))}
                  className="accent-primary w-full"
                />
              </div>

              {/* Icon colour swatches */}
              <div className="space-y-2">
                <Label>Icon colour</Label>
                <div className="flex flex-wrap gap-2">
                  {TEXT_COLOR_SWATCHES.map((s) => (
                    <button
                      key={s.name}
                      type="button"
                      title={s.name}
                      aria-label={`${s.name} icon colour`}
                      onClick={() =>
                        setSettings((prev) => ({
                          ...prev,
                          iconColor: s.color,
                          useCustomIconColor: false,
                        }))
                      }
                      className={`h-9 w-9 rounded-md border-2 transition-all ${
                        !settings.useCustomIconColor &&
                        settings.iconColor === s.color
                          ? "ring-primary scale-110 border-transparent ring-2 ring-offset-2"
                          : "border-border hover:scale-105"
                      }`}
                      style={{ background: s.color }}
                    />
                  ))}

                  {/* Custom icon colour toggle */}
                  <button
                    type="button"
                    title="Custom icon colour"
                    aria-label="Use custom icon colour"
                    onClick={() =>
                      set("useCustomIconColor", !settings.useCustomIconColor)
                    }
                    className={`flex h-9 w-9 items-center justify-center rounded-md border-2 text-lg font-bold transition-all ${
                      settings.useCustomIconColor
                        ? "ring-primary scale-110 border-transparent ring-2 ring-offset-2"
                        : "border-border hover:scale-105"
                    }`}
                    style={{
                      background:
                        "conic-gradient(from 0deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
                    }}
                  />
                </div>

                {settings.useCustomIconColor && (
                  <div className="flex gap-2 pt-1">
                    <input
                      type="color"
                      id="icon-color"
                      value={settings.iconColor}
                      onChange={(e) => set("iconColor", e.target.value)}
                      className="h-9 w-12 cursor-pointer rounded border"
                    />
                    <Input
                      value={settings.iconColor}
                      onChange={(e) => set("iconColor", e.target.value)}
                      className="max-w-28 font-mono text-sm"
                    />
                  </div>
                )}
              </div>

            </>
          )}

          {/* Background colour: 9 presets + gradient button + custom button = 11 */}
          <div className="space-y-2">
            <Label>Background colour</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  title={p.name}
                  aria-label={`${p.name} colour preset`}
                  onClick={() => handlePresetClick(p)}
                  className={`h-9 w-9 rounded-md border-2 transition-all ${
                    settings.bgMode === "preset" && preset.name === p.name
                      ? "ring-primary scale-110 border-transparent ring-2 ring-offset-2"
                      : "border-border hover:scale-105"
                  }`}
                  style={
                    p.mode === "gradient"
                      ? {
                          background: `linear-gradient(to bottom right, ${p.color1}, ${p.color2})`,
                        }
                      : { background: p.color1 }
                  }
                />
              ))}

              {/* Gradient toggle */}
              <button
                type="button"
                title="Custom gradient"
                aria-label="Use custom gradient"
                onClick={() =>
                  set(
                    "bgMode",
                    settings.bgMode === "gradient" ? "preset" : "gradient",
                  )
                }
                className={`flex h-9 w-9 items-center justify-center rounded-md border-2 transition-all ${
                  settings.bgMode === "gradient"
                    ? "ring-primary scale-110 border-transparent ring-2 ring-offset-2"
                    : "border-border hover:scale-105"
                }`}
                style={{
                  background: `linear-gradient(to bottom right, ${settings.customColor1}, ${settings.customColor2})`,
                }}
              />

              {/* Custom solid toggle */}
              <button
                type="button"
                title="Custom colour"
                aria-label="Use custom colour"
                onClick={() =>
                  set(
                    "bgMode",
                    settings.bgMode === "custom" ? "preset" : "custom",
                  )
                }
                className={`flex h-9 w-9 items-center justify-center rounded-md border-2 transition-all ${
                  settings.bgMode === "custom"
                    ? "ring-primary scale-110 border-transparent ring-2 ring-offset-2"
                    : "border-border hover:scale-105"
                }`}
                style={{
                  background:
                    "conic-gradient(from 0deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
                }}
              />
            </div>

            {/* Gradient panel */}
            {settings.bgMode === "gradient" && (
              <div className="bg-muted/50 space-y-4 rounded-lg border p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="color1">Colour 1</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        id="color1"
                        value={settings.customColor1}
                        onChange={(e) => set("customColor1", e.target.value)}
                        className="h-9 w-12 cursor-pointer rounded border"
                      />
                      <Input
                        value={settings.customColor1}
                        onChange={(e) => set("customColor1", e.target.value)}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="color2">Colour 2</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        id="color2"
                        value={settings.customColor2}
                        onChange={(e) => set("customColor2", e.target.value)}
                        className="h-9 w-12 cursor-pointer rounded border"
                      />
                      <Input
                        value={settings.customColor2}
                        onChange={(e) => set("customColor2", e.target.value)}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Gradient direction</Label>
                  <div className="flex gap-2">
                    {DIRECTION_OPTIONS.map((d) => (
                      <Button
                        key={d.value}
                        variant={
                          settings.customDirection === d.value
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => set("customDirection", d.value)}
                      >
                        {d.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Custom solid colour panel */}
            {settings.bgMode === "custom" && (
              <div className="flex gap-2 pt-1">
                <input
                  type="color"
                  id="bg-custom-color"
                  value={settings.customColor1}
                  onChange={(e) => set("customColor1", e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border"
                />
                <Input
                  value={settings.customColor1}
                  onChange={(e) => set("customColor1", e.target.value)}
                  className="max-w-28 font-mono text-sm"
                />
              </div>
            )}
          </div>

          {/* Border radius */}
          <div className="space-y-2">
            <Label>Corner style</Label>
            <div className="flex gap-2">
              {RADIUS_OPTIONS.map((r) => (
                <Button
                  key={r.value}
                  variant={
                    settings.borderRadius === r.value ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => set("borderRadius", r.value)}
                >
                  {r.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Preview + Export */}
        <div className="flex flex-col items-center gap-4">
          <Label>Preview</Label>
          <div
            className="border-border bg-muted/30 flex items-center justify-center rounded-lg border p-6"
            style={{
              backgroundImage:
                "repeating-conic-gradient(#80808015 0% 25%, transparent 0% 50%)",
              backgroundSize: "16px 16px",
            }}
          >
            <div
              className="h-64 w-64"
              dangerouslySetInnerHTML={{ __html: svgString }}
            />
          </div>

          {/* Export buttons */}
          <div className="flex w-full flex-col gap-2">
            <Button
              onClick={handleDownloadZip}
              disabled={!canExport || exporting}
              className="w-full"
            >
              <RiDownload2Line className="mr-2 h-4 w-4" aria-hidden />
              {exporting ? "Exporting\u2026" : "Download all (ZIP)"}
            </Button>

            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadSvg}
                disabled={!canExport}
              >
                SVG
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadIco}
                disabled={!canExport || exporting}
              >
                ICO
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadPng(512)}
                disabled={!canExport || exporting}
              >
                PNG 512
              </Button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {([16, 32, 64, 128, 180, 192, 256] as const).map((size) => (
                <Button
                  key={size}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownloadPng(size)}
                  disabled={!canExport || exporting}
                  className="text-xs"
                >
                  {size}px
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
