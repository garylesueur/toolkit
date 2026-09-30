"use client";

import dynamic from "next/dynamic";

const SketchBoard = dynamic(
  () => import("./sketch-board").then((mod) => mod.SketchBoard),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg border bg-muted/30 px-4 py-16 text-center text-sm text-muted-foreground">
        Loading canvas…
      </div>
    ),
  },
);

export default function SketchPadPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Sketch Pad</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Quick whiteboard for architecture doodles, UI wireframes, and arrows on
        a napkin. Draw in the browser, then download a PNG. Shortcuts: V select,
        P pen, H highlighter, E eraser, R rectangle, O ellipse, A arrow, L line,
        T text, ⌘Z undo.
      </p>
      <div className="mt-8">
        <SketchBoard />
      </div>
    </div>
  );
}
