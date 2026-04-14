import {
  COLOR_PRESETS,
  DEFAULT_FONT,
  DEFAULT_PRESET,
  FONT_OPTIONS,
} from "./presets";
import { ICON_ENTRIES } from "./icons";
import type { IconEntry } from "./icons";
import type {
  ColorPreset,
  FontOption,
  GradientDirection,
  IconVariant,
  LogoMode,
} from "./types";

export type BgMode = "preset" | "gradient" | "custom";

export interface LogoGeneratorSettings {
  mode: LogoMode;
  // Letters mode
  letters: string;
  fontName: string;
  textColor: string;
  useCustomTextColor: boolean;
  textSize: number;
  bottomPadding: number;
  horizontalOffset: number;
  // Icon mode
  iconName: string;
  iconVariant: IconVariant;
  iconSize: number;
  iconPadding: number;
  iconColor: string;
  useCustomIconColor: boolean;
  // Shared
  presetName: string;
  bgMode: BgMode;
  customColor1: string;
  customColor2: string;
  customDirection: GradientDirection;
  borderRadius: number;
}

export const LOGO_STATE_VERSION = 4;

export const DEFAULT_LOGO_SETTINGS: LogoGeneratorSettings = {
  mode: "letters",
  // Letters
  letters: "ab",
  fontName: DEFAULT_FONT.name,
  textColor: "#ffffff",
  useCustomTextColor: false,
  textSize: 100,
  bottomPadding: 36,
  horizontalOffset: 0,
  // Icon
  iconName: ICON_ENTRIES[0].name,
  iconVariant: "line",
  iconSize: 100,
  iconPadding: 64,
  iconColor: "#ffffff",
  useCustomIconColor: false,
  // Shared
  presetName: DEFAULT_PRESET.name,
  bgMode: "preset",
  customColor1: "#0066cc",
  customColor2: "#00ccff",
  customDirection: "to-br",
  borderRadius: 48,
};

export function resolveFont(name: string): FontOption {
  return FONT_OPTIONS.find((f) => f.name === name) ?? DEFAULT_FONT;
}

export function resolvePreset(name: string): ColorPreset {
  return COLOR_PRESETS.find((p) => p.name === name) ?? DEFAULT_PRESET;
}

export function resolveIcon(name: string): IconEntry {
  return ICON_ENTRIES.find((i) => i.name === name) ?? ICON_ENTRIES[0];
}
