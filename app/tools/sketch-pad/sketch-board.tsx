"use client";

import { RiDownload2Line } from "@remixicon/react";
import type { Transformer as KonvaTransformer } from "konva/lib/shapes/Transformer";
import type { Stage as KonvaStage } from "konva/lib/Stage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layer, Line, Rect, Stage, Transformer } from "react-konva";

import { ImageToolHandoff } from "@/components/image-tool-handoff";
import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { uuid } from "@/lib/shared/id";
import {
  BACKGROUNDS,
  CANVAS_ASPECT,
  CANVAS_MIN_HEIGHT,
  DEFAULT_FONT_SIZE,
  DEFAULT_PREFS,
  DEFAULT_TEXT,
  ERASER_WIDTH_MULTIPLIER,
  GRID_SIZE_PX,
  HIGHLIGHTER_OPACITY,
  HIGHLIGHTER_WIDTH_MULTIPLIER,
  IMAGE_HANDOFF_DESTINATIONS,
  PREFS_STORAGE_KEY,
  PREFS_VERSION,
} from "@/lib/sketch/constants";
import { downloadBlob, stageToPngBlob } from "@/lib/sketch/export";
import {
  boxFromPoints,
  ellipseFromPoints,
  isMeaningfulDrag,
  linePoints,
} from "@/lib/sketch/geometry";
import {
  createHistoryState,
  pushHistory,
  redoHistory,
  undoHistory,
} from "@/lib/sketch/history";
import type {
  HistoryState,
  Point,
  SketchElement,
  SketchPrefs,
  SketchTool,
  StrokeElement,
} from "@/lib/sketch/types";

import { SketchElementNodes } from "./sketch-element-nodes";
import { SketchToolbar } from "./sketch-toolbar";

type DraftShape = {
  start: Point;
  current: Point;
};

type TextEdit = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  value: string;
};

function backgroundFill(id: string): string {
  return BACKGROUNDS.find((bg) => bg.id === id)?.fill ?? BACKGROUNDS[0].fill;
}

function pointerOnStage(stage: KonvaStage): Point | null {
  const pos = stage.getPointerPosition();
  if (!pos) return null;
  return { x: pos.x, y: pos.y };
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function applyDragOffset(
  element: SketchElement,
  offsetX: number,
  offsetY: number,
): SketchElement {
  switch (element.kind) {
    case "stroke":
      return {
        ...element,
        points: element.points.map((value, index) =>
          index % 2 === 0 ? value + offsetX : value + offsetY,
        ),
      };
    case "rect":
    case "ellipse":
    case "text":
      return { ...element, x: element.x + offsetX, y: element.y + offsetY };
    case "arrow":
    case "line":
      return {
        ...element,
        points: [
          element.points[0] + offsetX,
          element.points[1] + offsetY,
          element.points[2] + offsetX,
          element.points[3] + offsetY,
        ],
      };
    default: {
      const exhaustive: never = element;
      return exhaustive;
    }
  }
}

function createStroke(
  prefs: SketchPrefs,
  point: Point,
  tool: "pen" | "highlighter" | "eraser",
): StrokeElement {
  const isHighlighter = tool === "highlighter";
  const isEraser = tool === "eraser";
  const width = isEraser
    ? prefs.strokeWidth * ERASER_WIDTH_MULTIPLIER
    : isHighlighter
      ? prefs.strokeWidth * HIGHLIGHTER_WIDTH_MULTIPLIER
      : prefs.strokeWidth;

  return {
    kind: "stroke",
    id: uuid(),
    points: [point.x, point.y],
    colour: isEraser ? "#000000" : prefs.colour,
    strokeWidth: width,
    opacity: isHighlighter ? HIGHLIGHTER_OPACITY : 1,
    composite: isEraser ? "destination-out" : "source-over",
  };
}

function createShapeFromDraft(
  tool: SketchTool,
  prefs: SketchPrefs,
  draft: DraftShape,
): SketchElement | null {
  if (!isMeaningfulDrag(draft.start, draft.current)) return null;
  if (tool === "rect") {
    const box = boxFromPoints(draft.start, draft.current);
    return {
      kind: "rect",
      id: uuid(),
      ...box,
      colour: prefs.colour,
      strokeWidth: prefs.strokeWidth,
    };
  }
  if (tool === "ellipse") {
    return {
      kind: "ellipse",
      id: uuid(),
      ...ellipseFromPoints(draft.start, draft.current),
      colour: prefs.colour,
      strokeWidth: prefs.strokeWidth,
    };
  }
  if (tool === "arrow") {
    return {
      kind: "arrow",
      id: uuid(),
      points: linePoints(draft.start, draft.current),
      colour: prefs.colour,
      strokeWidth: prefs.strokeWidth,
    };
  }
  if (tool === "line") {
    return {
      kind: "line",
      id: uuid(),
      points: linePoints(draft.start, draft.current),
      colour: prefs.colour,
      strokeWidth: prefs.strokeWidth,
    };
  }
  return null;
}

function gridLines(width: number, height: number): number[][] {
  const lines: number[][] = [];
  for (let x = GRID_SIZE_PX; x < width; x += GRID_SIZE_PX) {
    lines.push([x, 0, x, height]);
  }
  for (let y = GRID_SIZE_PX; y < height; y += GRID_SIZE_PX) {
    lines.push([0, y, width, y]);
  }
  return lines;
}

export function SketchBoard() {
  const [prefs, setPrefs] = usePersistedState<SketchPrefs>(
    PREFS_STORAGE_KEY,
    PREFS_VERSION,
    DEFAULT_PREFS,
  );
  const [history, setHistory] = useState<HistoryState>(createHistoryState);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftStroke, setDraftStroke] = useState<StrokeElement | null>(null);
  const [draftShape, setDraftShape] = useState<DraftShape | null>(null);
  const [textEdit, setTextEdit] = useState<TextEdit | null>(null);
  const [size, setSize] = useState({ width: 800, height: CANVAS_MIN_HEIGHT });
  const [exportError, setExportError] = useState<string | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<KonvaStage | null>(null);
  const transformerRef = useRef<KonvaTransformer | null>(null);
  const drawingRef = useRef(false);

  const elements = history.present;
  const selectEnabled = prefs.tool === "select";
  const fill = backgroundFill(prefs.backgroundId);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    function applySize(width: number) {
      setSize({
        width,
        height: Math.max(CANVAS_MIN_HEIGHT, Math.round(width * CANVAS_ASPECT)),
      });
    }

    applySize(el.clientWidth);
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      applySize(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = stageRef.current;
    if (!transformer || !stage) return;
    if (!selectedId || !selectEnabled) {
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
      return;
    }
    const node = stage.findOne("#" + selectedId);
    const className = node?.getClassName();
    const transformable =
      className === "Rect" || className === "Ellipse" || className === "Text";
    transformer.nodes(node && transformable ? [node] : []);
    transformer.getLayer()?.batchDraw();
  }, [selectedId, selectEnabled, elements]);

  const commit = useCallback((next: SketchElement[]) => {
    setHistory((current) => pushHistory(current, next));
  }, []);

  const updatePrefs = useCallback(
    (patch: Partial<SketchPrefs>) => {
      setPrefs((current) => ({ ...current, ...patch }));
    },
    [setPrefs],
  );

  const finishStroke = useCallback(() => {
    if (!draftStroke) return;
    commit([...elements, draftStroke]);
    setDraftStroke(null);
  }, [commit, draftStroke, elements]);

  const finishShape = useCallback(() => {
    if (!draftShape) return;
    const shape = createShapeFromDraft(prefs.tool, prefs, draftShape);
    setDraftShape(null);
    if (shape) commit([...elements, shape]);
  }, [commit, draftShape, elements, prefs]);

  const handlePointerDown = useCallback(() => {
    const stage = stageRef.current;
    if (!stage || textEdit) return;
    const point = pointerOnStage(stage);
    if (!point) return;

    if (prefs.tool === "select") {
      const target = stage.getIntersection(point);
      if (
        !target ||
        target.name() === "background" ||
        target.name() === "grid"
      ) {
        setSelectedId(null);
      }
      return;
    }

    drawingRef.current = true;
    if (
      prefs.tool === "pen" ||
      prefs.tool === "highlighter" ||
      prefs.tool === "eraser"
    ) {
      setSelectedId(null);
      setDraftStroke(createStroke(prefs, point, prefs.tool));
      return;
    }

    if (
      prefs.tool === "rect" ||
      prefs.tool === "ellipse" ||
      prefs.tool === "arrow" ||
      prefs.tool === "line"
    ) {
      setSelectedId(null);
      setDraftShape({ start: point, current: point });
      return;
    }

    if (prefs.tool === "text") {
      const id = uuid();
      const next: SketchElement = {
        kind: "text",
        id,
        x: point.x,
        y: point.y,
        text: DEFAULT_TEXT,
        colour: prefs.colour,
        fontSize: DEFAULT_FONT_SIZE,
      };
      commit([...elements, next]);
      setSelectedId(id);
      setTextEdit({
        id,
        x: point.x,
        y: point.y,
        width: 220,
        height: 36,
        value: DEFAULT_TEXT,
      });
      updatePrefs({ tool: "select" });
    }
  }, [commit, elements, prefs, textEdit, updatePrefs]);

  const handlePointerMove = useCallback(() => {
    if (!drawingRef.current) return;
    const stage = stageRef.current;
    if (!stage) return;
    const point = pointerOnStage(stage);
    if (!point) return;

    if (draftStroke) {
      setDraftStroke({
        ...draftStroke,
        points: [...draftStroke.points, point.x, point.y],
      });
    }
    if (draftShape) {
      setDraftShape({ ...draftShape, current: point });
    }
  }, [draftShape, draftStroke]);

  const handlePointerUp = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    finishStroke();
    finishShape();
  }, [finishShape, finishStroke]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const handleDragEnd = useCallback(
    (id: string, x: number, y: number) => {
      const next = elements.map((element) => {
        if (element.id !== id) return element;
        const node = stageRef.current?.findOne("#" + id);
        node?.position({ x: 0, y: 0 });
        return applyDragOffset(element, x, y);
      });
      commit(next);
    },
    [commit, elements],
  );

  const handleTransformEnd = useCallback(() => {
    const stage = stageRef.current;
    if (!stage || !selectedId) return;
    const node = stage.findOne("#" + selectedId);
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);

    const next = elements.map((element) => {
      if (element.id !== selectedId) return element;
      if (element.kind === "rect") {
        return {
          ...element,
          x: node.x(),
          y: node.y(),
          width: Math.max(4, node.width() * scaleX),
          height: Math.max(4, node.height() * scaleY),
        };
      }
      if (element.kind === "ellipse") {
        return {
          ...element,
          x: node.x(),
          y: node.y(),
          radiusX: Math.max(2, node.width() * scaleX) / 2,
          radiusY: Math.max(2, node.height() * scaleY) / 2,
        };
      }
      if (element.kind === "text") {
        return {
          ...element,
          x: node.x(),
          y: node.y(),
          fontSize: Math.max(10, element.fontSize * scaleY),
        };
      }
      return element;
    });
    commit(next);
  }, [commit, elements, selectedId]);

  const beginTextEdit = useCallback(
    (id: string) => {
      const element = elements.find(
        (item) => item.id === id && item.kind === "text",
      );
      if (!element || element.kind !== "text") return;
      setTextEdit({
        id,
        x: element.x,
        y: element.y,
        width: Math.max(160, element.text.length * (element.fontSize * 0.6)),
        height: element.fontSize + 14,
        value: element.text,
      });
    },
    [elements],
  );

  const commitTextEdit = useCallback(() => {
    if (!textEdit) return;
    const next = elements.map((element) => {
      if (element.id !== textEdit.id || element.kind !== "text") return element;
      return { ...element, text: textEdit.value || DEFAULT_TEXT };
    });
    commit(next);
    setTextEdit(null);
  }, [commit, elements, textEdit]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    commit(elements.filter((element) => element.id !== selectedId));
    setSelectedId(null);
  }, [commit, elements, selectedId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return;

      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          setHistory(redoHistory);
        } else {
          setHistory(undoHistory);
        }
        return;
      }
      if (meta && event.key.toLowerCase() === "y") {
        event.preventDefault();
        setHistory(redoHistory);
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedId && !textEdit) {
          event.preventDefault();
          deleteSelected();
        }
        return;
      }
      if (event.key === "Escape") {
        setSelectedId(null);
        setTextEdit(null);
        return;
      }

      const key = event.key.toLowerCase();
      const shortcut: Record<string, SketchTool> = {
        v: "select",
        p: "pen",
        h: "highlighter",
        e: "eraser",
        r: "rect",
        o: "ellipse",
        a: "arrow",
        l: "line",
        t: "text",
      };
      const tool = shortcut[key];
      if (tool && !meta) {
        updatePrefs({ tool });
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteSelected, selectedId, textEdit, updatePrefs]);

  const previewShape = useMemo(() => {
    if (!draftShape) return null;
    return createShapeFromDraft(prefs.tool, prefs, draftShape);
  }, [draftShape, prefs]);

  const visibleElements = useMemo(() => {
    const list = [...elements];
    if (draftStroke) list.push(draftStroke);
    if (previewShape) list.push(previewShape);
    return list;
  }, [draftStroke, elements, previewShape]);

  const grid = useMemo(
    () => (prefs.showGrid ? gridLines(size.width, size.height) : []),
    [prefs.showGrid, size.height, size.width],
  );

  const exportStage = useCallback(async () => {
    const stage = stageRef.current;
    const transformer = transformerRef.current;
    if (!stage) {
      throw new Error("Canvas is not ready.");
    }
    transformer?.nodes([]);
    transformer?.getLayer()?.batchDraw();
    const blob = await stageToPngBlob(stage);
    if (selectedId) {
      const node = stage.findOne("#" + selectedId);
      if (node) transformer?.nodes([node]);
    }
    return blob;
  }, [selectedId]);

  const handleDownload = useCallback(async () => {
    try {
      const blob = await exportStage();
      downloadBlob(blob, "sketch.png");
      setExportError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export failed.";
      setExportError(message);
    }
  }, [exportStage]);

  const getArtifact = useCallback(async () => {
    const blob = await exportStage();
    return {
      blob,
      filename: "sketch.png",
      sourceHref: "/tools/sketch-pad",
    };
  }, [exportStage]);

  const gridColour =
    prefs.backgroundId === "slate"
      ? "rgba(255,255,255,0.08)"
      : "rgba(15,23,42,0.08)";

  return (
    <div className="space-y-4">
      <SketchToolbar
        prefs={prefs}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        hasContent={elements.length > 0}
        onTool={(tool) => updatePrefs({ tool })}
        onColour={(colour) => updatePrefs({ colour })}
        onStrokeWidth={(strokeWidth) => updatePrefs({ strokeWidth })}
        onBackground={(backgroundId) => updatePrefs({ backgroundId })}
        onToggleGrid={() => updatePrefs({ showGrid: !prefs.showGrid })}
        onUndo={() => setHistory(undoHistory)}
        onRedo={() => setHistory(redoHistory)}
        onClear={() => {
          commit([]);
          setSelectedId(null);
        }}
      />

      <div
        ref={wrapRef}
        className="relative overflow-hidden rounded-lg border"
        style={{ height: size.height }}
      >
        <Stage
          ref={stageRef}
          width={size.width}
          height={size.height}
          onMouseDown={handlePointerDown}
          onMousemove={handlePointerMove}
          onMouseup={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        >
          <Layer listening={false}>
            {/* Separate layer so destination-out eraser never punches the paper. */}
            <Rect
              name="background"
              x={0}
              y={0}
              width={size.width}
              height={size.height}
              fill={fill}
            />
            {grid.map((points, index) => (
              <Line
                key={`grid-${index}`}
                name="grid"
                points={points}
                stroke={gridColour}
                strokeWidth={1}
              />
            ))}
          </Layer>
          <Layer>
            <SketchElementNodes
              elements={visibleElements}
              selectEnabled={selectEnabled}
              onSelect={handleSelect}
              onDragEnd={handleDragEnd}
              onTextDblClick={beginTextEdit}
            />
            <Transformer
              ref={transformerRef}
              rotateEnabled={false}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 8 || newBox.height < 8) return oldBox;
                return newBox;
              }}
              onTransformEnd={handleTransformEnd}
            />
          </Layer>
        </Stage>
        {textEdit ? (
          <textarea
            autoFocus
            aria-label="Edit sketch text"
            value={textEdit.value}
            onChange={(event) =>
              setTextEdit({ ...textEdit, value: event.target.value })
            }
            onBlur={commitTextEdit}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                commitTextEdit();
              }
            }}
            className="border-primary absolute z-10 rounded border bg-background px-1 py-0.5 text-sm shadow-sm outline-none"
            style={{
              left: textEdit.x,
              top: textEdit.y,
              width: textEdit.width,
              height: textEdit.height,
            }}
          />
        ) : null}
      </div>

      {exportError ? (
        <p className="text-destructive text-sm" role="alert">
          {exportError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={handleDownload}>
          <RiDownload2Line data-icon="inline-start" aria-hidden />
          Download PNG
        </Button>
        <ImageToolHandoff
          getArtifact={getArtifact}
          destinations={IMAGE_HANDOFF_DESTINATIONS}
        />
      </div>

      <PrivacyBanner>
        Sketches stay in this browser. Nothing is uploaded — export is a local
        PNG download.
      </PrivacyBanner>
    </div>
  );
}
