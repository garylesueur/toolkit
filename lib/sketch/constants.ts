import type {
  BackgroundOption,
  ColourSwatch,
  SketchPrefs,
  ToolDefinition,
} from "@/lib/sketch/types";

export const MAX_HISTORY = 80;
export const MIN_SHAPE_SIZE = 4;
export const DEFAULT_FONT_SIZE = 22;
export const DEFAULT_TEXT = "Text";
export const CANVAS_MIN_HEIGHT = 460;
export const CANVAS_ASPECT = 0.62;
export const GRID_SIZE_PX = 24;
export const HIGHLIGHTER_OPACITY = 0.35;
export const HIGHLIGHTER_WIDTH_MULTIPLIER = 4;
export const ERASER_WIDTH_MULTIPLIER = 6;
export const EXPORT_PIXEL_RATIO = 2;
export const PREFS_STORAGE_KEY = "toolkit:sketch-pad";
export const PREFS_VERSION = 1;

export const COLOUR_SWATCHES: ColourSwatch[] = [
  { id: "ink", label: "Ink", value: "#111827" },
  { id: "white", label: "White", value: "#ffffff" },
  { id: "slate", label: "Slate", value: "#64748b" },
  { id: "red", label: "Red", value: "#dc2626" },
  { id: "orange", label: "Orange", value: "#ea580c" },
  { id: "amber", label: "Amber", value: "#d97706" },
  { id: "green", label: "Green", value: "#16a34a" },
  { id: "teal", label: "Teal", value: "#0d9488" },
  { id: "blue", label: "Blue", value: "#2563eb" },
  { id: "violet", label: "Violet", value: "#7c3aed" },
  { id: "pink", label: "Pink", value: "#db2777" },
];

export const STROKE_WIDTHS = [2, 4, 8, 12] as const;

export const BACKGROUNDS: BackgroundOption[] = [
  { id: "white", label: "White", fill: "#ffffff" },
  { id: "paper", label: "Paper", fill: "#f4f0e6" },
  { id: "slate", label: "Slate", fill: "#1e293b" },
];

export const TOOLS: ToolDefinition[] = [
  { id: "select", label: "Select", shortcut: "V" },
  { id: "pen", label: "Pen", shortcut: "P" },
  { id: "highlighter", label: "Highlighter", shortcut: "H" },
  { id: "eraser", label: "Eraser", shortcut: "E" },
  { id: "rect", label: "Rectangle", shortcut: "R" },
  { id: "ellipse", label: "Ellipse", shortcut: "O" },
  { id: "arrow", label: "Arrow", shortcut: "A" },
  { id: "line", label: "Line", shortcut: "L" },
  { id: "text", label: "Text", shortcut: "T" },
];

export const DEFAULT_PREFS: SketchPrefs = {
  tool: "pen",
  colour: COLOUR_SWATCHES[0].value,
  strokeWidth: 4,
  backgroundId: "white",
  showGrid: true,
};

export const IMAGE_HANDOFF_DESTINATIONS = [
  { label: "Image Crop & Resize", href: "/tools/image-crop-resize" },
  { label: "App Icon Bundle", href: "/tools/app-icon-bundle" },
  { label: "Favicon Generator", href: "/tools/favicon-generator" },
  {
    label: "Chrome Extension Icons",
    href: "/tools/chrome-extension-icons",
  },
];
