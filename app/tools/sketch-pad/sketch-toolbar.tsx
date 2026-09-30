"use client";

import {
  RiArrowGoBackLine,
  RiArrowGoForwardLine,
  RiArrowRightUpLine,
  RiBrushLine,
  RiCheckboxBlankLine,
  RiCircleLine,
  RiCursorLine,
  RiDeleteBin6Line,
  RiEraserLine,
  RiFontSize,
  RiGridLine,
  RiPencilLine,
  RiSubtractLine,
} from "@remixicon/react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  BACKGROUNDS,
  COLOUR_SWATCHES,
  STROKE_WIDTHS,
} from "@/lib/sketch/constants";
import type { SketchPrefs, SketchTool } from "@/lib/sketch/types";
import { cn } from "@/lib/utils";

type SketchToolbarProps = {
  prefs: SketchPrefs;
  canUndo: boolean;
  canRedo: boolean;
  hasContent: boolean;
  onTool: (tool: SketchTool) => void;
  onColour: (colour: string) => void;
  onStrokeWidth: (width: number) => void;
  onBackground: (id: string) => void;
  onToggleGrid: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
};

type ToolButton = {
  id: SketchTool;
  label: string;
  shortcut: string;
  icon: ReactNode;
};

const TOOL_BUTTONS: ToolButton[] = [
  {
    id: "select",
    label: "Select",
    shortcut: "V",
    icon: <RiCursorLine aria-hidden />,
  },
  {
    id: "pen",
    label: "Pen",
    shortcut: "P",
    icon: <RiPencilLine aria-hidden />,
  },
  {
    id: "highlighter",
    label: "Highlighter",
    shortcut: "H",
    icon: <RiBrushLine aria-hidden />,
  },
  {
    id: "eraser",
    label: "Eraser",
    shortcut: "E",
    icon: <RiEraserLine aria-hidden />,
  },
  {
    id: "rect",
    label: "Rectangle",
    shortcut: "R",
    icon: <RiCheckboxBlankLine aria-hidden />,
  },
  {
    id: "ellipse",
    label: "Ellipse",
    shortcut: "O",
    icon: <RiCircleLine aria-hidden />,
  },
  {
    id: "arrow",
    label: "Arrow",
    shortcut: "A",
    icon: <RiArrowRightUpLine aria-hidden />,
  },
  {
    id: "line",
    label: "Line",
    shortcut: "L",
    icon: <RiSubtractLine aria-hidden />,
  },
  {
    id: "text",
    label: "Text",
    shortcut: "T",
    icon: <RiFontSize aria-hidden />,
  },
];

export function SketchToolbar({
  prefs,
  canUndo,
  canRedo,
  hasContent,
  onTool,
  onColour,
  onStrokeWidth,
  onBackground,
  onToggleGrid,
  onUndo,
  onRedo,
  onClear,
}: SketchToolbarProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-muted-foreground mb-2 text-xs font-medium">Tools</p>
        <div className="flex flex-wrap gap-1">
          {TOOL_BUTTONS.map((tool) => (
            <Button
              key={tool.id}
              type="button"
              size="icon-sm"
              variant={prefs.tool === tool.id ? "default" : "outline"}
              aria-label={`${tool.label} (${tool.shortcut})`}
              aria-pressed={prefs.tool === tool.id}
              title={`${tool.label} (${tool.shortcut})`}
              onClick={() => onTool(tool.id)}
            >
              {tool.icon}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-muted-foreground mb-2 text-xs font-medium">Colour</p>
        <div className="flex flex-wrap gap-1.5">
          {COLOUR_SWATCHES.map((swatch) => (
            <button
              key={swatch.id}
              type="button"
              aria-label={swatch.label}
              aria-pressed={prefs.colour === swatch.value}
              title={swatch.label}
              onClick={() => onColour(swatch.value)}
              className={cn(
                "size-7 rounded-full border-2",
                prefs.colour === swatch.value
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border",
              )}
              style={{ backgroundColor: swatch.value }}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-6">
        <div className="space-y-1.5">
          <Label htmlFor="sketch-stroke">Stroke</Label>
          <select
            id="sketch-stroke"
            className="border-input bg-background h-9 rounded-md border px-2 text-sm"
            value={prefs.strokeWidth}
            onChange={(event) => onStrokeWidth(Number(event.target.value))}
          >
            {STROKE_WIDTHS.map((width) => (
              <option key={width} value={width}>
                {width}px
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sketch-bg">Background</Label>
          <select
            id="sketch-bg"
            className="border-input bg-background h-9 rounded-md border px-2 text-sm"
            value={prefs.backgroundId}
            onChange={(event) => onBackground(event.target.value)}
          >
            {BACKGROUNDS.map((bg) => (
              <option key={bg.id} value={bg.id}>
                {bg.label}
              </option>
            ))}
          </select>
        </div>

        <Button
          type="button"
          variant={prefs.showGrid ? "default" : "outline"}
          size="sm"
          aria-pressed={prefs.showGrid}
          onClick={onToggleGrid}
        >
          <RiGridLine data-icon="inline-start" aria-hidden />
          Grid
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
        >
          <RiArrowGoBackLine data-icon="inline-start" aria-hidden />
          Undo
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
        >
          <RiArrowGoForwardLine data-icon="inline-start" aria-hidden />
          Redo
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClear}
          disabled={!hasContent}
        >
          <RiDeleteBin6Line data-icon="inline-start" aria-hidden />
          Clear
        </Button>
      </div>
    </div>
  );
}
