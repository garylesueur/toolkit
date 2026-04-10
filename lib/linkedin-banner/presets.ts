import type { GradientPreset } from "./types";

export const GRADIENT_PRESETS: GradientPreset[] = [
  {
    name: "Ocean",
    startColor: "#0066cc",
    endColor: "#00ccff",
    angle: 135,
    type: "linear",
  },
  {
    name: "Sunset",
    startColor: "#ff6b6b",
    endColor: "#ffa500",
    angle: 45,
    type: "linear",
  },
  {
    name: "Midnight",
    startColor: "#1a1a2e",
    endColor: "#16213e",
    angle: 180,
    type: "linear",
  },
  {
    name: "Forest",
    startColor: "#2d5016",
    endColor: "#5a9f3a",
    angle: 90,
    type: "linear",
  },
  {
    name: "Slate",
    startColor: "#4a5568",
    endColor: "#718096",
    angle: 120,
    type: "linear",
  },
  {
    name: "Purple Dream",
    startColor: "#667eea",
    endColor: "#764ba2",
    angle: 135,
    type: "linear",
  },
];

export const DEFAULT_PRESET = GRADIENT_PRESETS[0];
