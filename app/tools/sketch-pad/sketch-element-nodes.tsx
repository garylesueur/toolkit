"use client";

import { Arrow, Ellipse, Line, Rect, Text } from "react-konva";

import type { SketchElement } from "@/lib/sketch/types";

type SketchElementNodesProps = {
  elements: SketchElement[];
  selectEnabled: boolean;
  onSelect: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onTextDblClick: (id: string) => void;
};

export function SketchElementNodes({
  elements,
  selectEnabled,
  onSelect,
  onDragEnd,
  onTextDblClick,
}: SketchElementNodesProps) {
  return (
    <>
      {elements.map((element) => {
        const common = {
          id: element.id,
          key: element.id,
          draggable: selectEnabled,
          onClick: () => {
            if (selectEnabled) onSelect(element.id);
          },
          onTap: () => {
            if (selectEnabled) onSelect(element.id);
          },
        };

        switch (element.kind) {
          case "stroke":
            return (
              <Line
                {...common}
                points={element.points}
                stroke={element.colour}
                strokeWidth={element.strokeWidth}
                opacity={element.opacity}
                globalCompositeOperation={element.composite}
                lineCap="round"
                lineJoin="round"
                tension={0.35}
                hitStrokeWidth={Math.max(16, element.strokeWidth + 8)}
                onDragEnd={(event) => {
                  onDragEnd(element.id, event.target.x(), event.target.y());
                }}
              />
            );
          case "rect":
            return (
              <Rect
                {...common}
                x={element.x}
                y={element.y}
                width={element.width}
                height={element.height}
                stroke={element.colour}
                strokeWidth={element.strokeWidth}
                fillEnabled={false}
                onDragEnd={(event) => {
                  onDragEnd(element.id, event.target.x(), event.target.y());
                }}
              />
            );
          case "ellipse":
            return (
              <Ellipse
                {...common}
                x={element.x}
                y={element.y}
                radiusX={element.radiusX}
                radiusY={element.radiusY}
                stroke={element.colour}
                strokeWidth={element.strokeWidth}
                fillEnabled={false}
                onDragEnd={(event) => {
                  onDragEnd(element.id, event.target.x(), event.target.y());
                }}
              />
            );
          case "arrow":
            return (
              <Arrow
                {...common}
                points={element.points}
                stroke={element.colour}
                fill={element.colour}
                strokeWidth={element.strokeWidth}
                pointerLength={12}
                pointerWidth={12}
                lineCap="round"
                lineJoin="round"
                onDragEnd={(event) => {
                  onDragEnd(element.id, event.target.x(), event.target.y());
                }}
              />
            );
          case "line":
            return (
              <Line
                {...common}
                points={element.points}
                stroke={element.colour}
                strokeWidth={element.strokeWidth}
                lineCap="round"
                onDragEnd={(event) => {
                  onDragEnd(element.id, event.target.x(), event.target.y());
                }}
              />
            );
          case "text":
            return (
              <Text
                {...common}
                x={element.x}
                y={element.y}
                text={element.text}
                fill={element.colour}
                fontSize={element.fontSize}
                fontFamily="ui-sans-serif, system-ui, sans-serif"
                onDblClick={() => onTextDblClick(element.id)}
                onDblTap={() => onTextDblClick(element.id)}
                onDragEnd={(event) => {
                  onDragEnd(element.id, event.target.x(), event.target.y());
                }}
              />
            );
          default: {
            const exhaustive: never = element;
            return exhaustive;
          }
        }
      })}
    </>
  );
}
