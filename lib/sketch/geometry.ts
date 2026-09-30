import { MIN_SHAPE_SIZE } from "@/lib/sketch/constants";
import type { Point } from "@/lib/sketch/types";

export type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function boxFromPoints(start: Point, end: Point): Box {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  return {
    x,
    y,
    width: Math.max(MIN_SHAPE_SIZE, Math.abs(end.x - start.x)),
    height: Math.max(MIN_SHAPE_SIZE, Math.abs(end.y - start.y)),
  };
}

export type EllipseGeometry = {
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
};

export function ellipseFromPoints(start: Point, end: Point): EllipseGeometry {
  const box = boxFromPoints(start, end);
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
    radiusX: box.width / 2,
    radiusY: box.height / 2,
  };
}

export function isMeaningfulDrag(start: Point, end: Point): boolean {
  return Math.hypot(end.x - start.x, end.y - start.y) >= MIN_SHAPE_SIZE;
}

export function linePoints(
  start: Point,
  end: Point,
): [number, number, number, number] {
  return [start.x, start.y, end.x, end.y];
}
