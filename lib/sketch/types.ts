export type SketchTool =
  | "select"
  | "pen"
  | "highlighter"
  | "eraser"
  | "rect"
  | "ellipse"
  | "arrow"
  | "line"
  | "text";

export type Point = {
  x: number;
  y: number;
};

export type StrokeElement = {
  kind: "stroke";
  id: string;
  points: number[];
  colour: string;
  strokeWidth: number;
  opacity: number;
  composite: "source-over" | "destination-out";
};

export type RectElement = {
  kind: "rect";
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  colour: string;
  strokeWidth: number;
};

export type EllipseElement = {
  kind: "ellipse";
  id: string;
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  colour: string;
  strokeWidth: number;
};

export type ArrowElement = {
  kind: "arrow";
  id: string;
  points: [number, number, number, number];
  colour: string;
  strokeWidth: number;
};

export type LineElement = {
  kind: "line";
  id: string;
  points: [number, number, number, number];
  colour: string;
  strokeWidth: number;
};

export type TextElement = {
  kind: "text";
  id: string;
  x: number;
  y: number;
  text: string;
  colour: string;
  fontSize: number;
};

export type SketchElement =
  | StrokeElement
  | RectElement
  | EllipseElement
  | ArrowElement
  | LineElement
  | TextElement;

export type HistoryState = {
  past: SketchElement[][];
  present: SketchElement[];
  future: SketchElement[][];
};

export type SketchPrefs = {
  tool: SketchTool;
  colour: string;
  strokeWidth: number;
  backgroundId: string;
  showGrid: boolean;
};

export type BackgroundOption = {
  id: string;
  label: string;
  fill: string;
};

export type ColourSwatch = {
  id: string;
  label: string;
  value: string;
};

export type ToolDefinition = {
  id: SketchTool;
  label: string;
  shortcut: string;
};
