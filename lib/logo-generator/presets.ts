import type { ColorPreset, FontOption } from "./types";

export const COLOR_PRESETS: ColorPreset[] = [
  {
    name: "Midnight",
    mode: "solid",
    color1: "#1a1a2e",
    color2: "#1a1a2e",
    direction: "to-br",
  },
  {
    name: "Ocean",
    mode: "gradient",
    color1: "#0066cc",
    color2: "#00ccff",
    direction: "to-br",
  },
  {
    name: "Sunset",
    mode: "gradient",
    color1: "#ff6b6b",
    color2: "#ffa500",
    direction: "to-br",
  },
  {
    name: "Forest",
    mode: "solid",
    color1: "#16a34a",
    color2: "#16a34a",
    direction: "to-br",
  },
  {
    name: "Royal",
    mode: "gradient",
    color1: "#667eea",
    color2: "#764ba2",
    direction: "to-br",
  },
  {
    name: "Ember",
    mode: "solid",
    color1: "#dc2626",
    color2: "#dc2626",
    direction: "to-br",
  },
  {
    name: "Sky",
    mode: "gradient",
    color1: "#38bdf8",
    color2: "#0284c7",
    direction: "to-b",
  },
  {
    name: "Coral",
    mode: "gradient",
    color1: "#f472b6",
    color2: "#db2777",
    direction: "to-br",
  },
  {
    name: "Charcoal",
    mode: "solid",
    color1: "#18181b",
    color2: "#18181b",
    direction: "to-br",
  },
];

export const DEFAULT_PRESET = COLOR_PRESETS[1]; // Ocean

export const FONT_OPTIONS: FontOption[] = [
  {
    name: "Public Sans",
    family: "'Public Sans', sans-serif",
    weight: 700,
    googleFamily: "Public+Sans:wght@700",
  },
  {
    name: "Inter",
    family: "'Inter', sans-serif",
    weight: 700,
    googleFamily: "Inter:wght@700",
  },
  {
    name: "Outfit",
    family: "'Outfit', sans-serif",
    weight: 700,
    googleFamily: "Outfit:wght@700",
  },
  {
    name: "Space Grotesk",
    family: "'Space Grotesk', sans-serif",
    weight: 700,
    googleFamily: "Space+Grotesk:wght@700",
  },
  {
    name: "DM Sans",
    family: "'DM Sans', sans-serif",
    weight: 700,
    googleFamily: "DM+Sans:wght@700",
  },
  {
    name: "Sora",
    family: "'Sora', sans-serif",
    weight: 700,
    googleFamily: "Sora:wght@700",
  },
  {
    name: "Rubik",
    family: "'Rubik', sans-serif",
    weight: 700,
    googleFamily: "Rubik:wght@700",
  },
  {
    name: "Poppins",
    family: "'Poppins', sans-serif",
    weight: 700,
    googleFamily: "Poppins:wght@700",
  },
  {
    name: "Playfair Display",
    family: "'Playfair Display', serif",
    weight: 700,
    googleFamily: "Playfair+Display:wght@700",
  },
  {
    name: "JetBrains Mono",
    family: "'JetBrains Mono', monospace",
    weight: 700,
    googleFamily: "JetBrains+Mono:wght@700",
  },
];

export const DEFAULT_FONT = FONT_OPTIONS[0]; // Public Sans

export interface TextColorSwatch {
  name: string;
  color: string;
}

// 10 swatches + 1 custom button = 11 items per row
export const TEXT_COLOR_SWATCHES: TextColorSwatch[] = [
  { name: "White", color: "#ffffff" },
  { name: "Light grey", color: "#94a3b8" },
  { name: "Black", color: "#000000" },
  { name: "Navy", color: "#1e3a5f" },
  { name: "Yellow", color: "#facc15" },
  { name: "Orange", color: "#f97316" },
  { name: "Red", color: "#ef4444" },
  { name: "Pink", color: "#ec4899" },
  { name: "Lime", color: "#84cc16" },
  { name: "Cyan", color: "#06b6d4" },
];

export const DEFAULT_TEXT_COLOR = TEXT_COLOR_SWATCHES[0]; // White
