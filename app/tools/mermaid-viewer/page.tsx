"use client";

import { RiUploadCloud2Line } from "@remixicon/react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const MAX_FILE_BYTES = 50_000;
const SAMPLE = `flowchart LR
    A[Open a Mermaid file] --> B[Render in your browser]
    B --> C[Explore your diagram]
    C --> D[Zoom in]
    C --> E[Edit the source]
`;

export default function MermaidViewerPage() {
  const [source, setSource] = useState("");
  const [filename, setFilename] = useState("");
  const [fileError, setFileError] = useState("");
  const [renderError, setRenderError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [rendering, setRendering] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [zoom, setZoom] = useState(100);
  const inputRef = useRef<HTMLInputElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const fileRequest = useRef(0);
  const { resolvedTheme } = useTheme();
  const viewerOpen = Boolean(source.trim());

  useEffect(() => {
    if (!viewerOpen) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    viewerRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        ++fileRequest.current;
        setSource("");
        setFilename("");
        setFileError("");
      }
      if (event.key === "Tab") {
        const controls = viewerRef.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), summary, details[open] textarea",
        );
        if (!controls?.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [viewerOpen]);

  async function openFiles(files: FileList) {
    const request = ++fileRequest.current;
    setFileError("");
    if (files.length !== 1) {
      setFileError("Please open one Mermaid file at a time.");
      return;
    }
    const file = files[0];
    if (!/\.(mmd|mermaid)$/i.test(file.name)) {
      setFileError("Choose a Mermaid file with a .mmd or .mermaid extension.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError(
        "This file is too large. Choose a Mermaid file under 50 KB.",
      );
      return;
    }
    try {
      const text = await file.text();
      if (request !== fileRequest.current) return;
      if (!text.trim()) {
        setFileError(
          "This Mermaid file is empty. Choose a file containing a diagram.",
        );
        return;
      }
      setSource(text);
      setFilename(file.name);
      setZoom(100);
    } catch {
      if (request === fileRequest.current) {
        setFileError("Could not read this file. Please try opening it again.");
      }
    }
  }

  useEffect(() => {
    let cancelled = false;
    let url = "";
    setPreviewUrl("");
    setRenderError("");
    setRendering(Boolean(source.trim()));
    if (!source.trim()) return;

    const timer = setTimeout(async () => {
      // Keep Mermaid's measuring elements out of the visible page. Passing a
      // container also lets us remove all temporary markup after a parse error.
      const container = document.createElement("div");
      container.style.cssText =
        "position:fixed;left:-10000px;visibility:hidden";
      try {
        const { default: mermaid } = await import("mermaid");
        if (cancelled) return;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          suppressErrorRendering: true,
          theme: resolvedTheme === "dark" ? "dark" : "default",
          maxTextSize: MAX_FILE_BYTES,
        });
        document.body.appendChild(container);
        const { svg } = await mermaid.render(
          `mermaid-${crypto.randomUUID()}`,
          source,
          container,
        );
        if (cancelled) return;
        // Display as an image so diagram content cannot run scripts or load
        // external resources in the page, even if it contains SVG markup.
        url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
        setPreviewUrl(url);
      } catch (error) {
        if (!cancelled) {
          setRenderError(
            error instanceof Error
              ? error.message
              : "Could not render this diagram.",
          );
        }
      } finally {
        container.remove();
        if (!cancelled) setRendering(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (url) URL.revokeObjectURL(url);
    };
  }, [source, resolvedTheme]);

  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        void openFiles(event.dataTransfer.files);
      }}
    >
      <h1 className="text-2xl font-bold tracking-tight">Mermaid Viewer</h1>
      <p className="text-muted-foreground mt-1">
        Open a Mermaid file to view its diagram, or drop it below.
      </p>
      <PrivacyBanner>
        Your files are processed entirely in your browser. Nothing is uploaded
        or stored.
      </PrivacyBanner>

      <button
        type="button"
        className={`mt-6 flex w-full cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDragOver(false);
          void openFiles(event.dataTransfer.files);
        }}
      >
        <RiUploadCloud2Line className="text-muted-foreground size-8" />
        <span className="text-sm font-medium">
          Drop your Mermaid file here, or click to open
        </span>
        <span className="text-muted-foreground text-xs">
          .mmd or .mermaid · One file · Up to 50 KB
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".mmd,.mermaid"
        aria-label="Open Mermaid file"
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) void openFiles(event.target.files);
          event.target.value = "";
        }}
      />
      {fileError && (
        <p role="alert" className="text-destructive mt-3 text-sm">
          {fileError}
        </p>
      )}

      <div
        ref={viewerRef}
        className={
          source.trim()
            ? "fixed inset-0 z-50 flex flex-col bg-background p-4 sm:p-6"
            : "mt-6"
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 break-all text-sm font-medium">
            {filename || "Diagram preview"}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {source.trim() && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
              >
                Open file
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={!previewUrl || zoom <= 25}
              aria-label="Zoom out"
              onClick={() => setZoom((value) => value - 25)}
            >
              −
            </Button>
            <span className="w-12 text-center text-sm" aria-live="polite">
              {zoom}%
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!previewUrl || zoom >= 400}
              aria-label="Zoom in"
              onClick={() => setZoom((value) => value + 25)}
            >
              +
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!previewUrl}
              onClick={() => setZoom(100)}
            >
              Fit
            </Button>
            {source.trim() && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  ++fileRequest.current;
                  setSource("");
                  setFilename("");
                  setFileError("");
                }}
              >
                Close viewer
              </Button>
            )}
          </div>
        </div>
        {source.trim() && fileError && (
          <p role="alert" className="text-destructive mt-3 text-sm">
            {fileError}
          </p>
        )}
        <div
          className={
            source.trim()
              ? "mt-3 min-h-0 flex-1 overflow-auto rounded-lg border bg-background p-4"
              : "mt-3 min-h-80 overflow-auto rounded-lg border bg-background p-6"
          }
          aria-busy={rendering}
        >
          {rendering && (
            <output className="text-muted-foreground text-sm">
              Rendering diagram…
            </output>
          )}
          {renderError && (
            <div role="alert" className="text-destructive text-sm">
              <p className="font-medium">
                Could not render this Mermaid diagram. Check the source below.
              </p>
              <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs">
                {renderError}
              </pre>
            </div>
          )}
          {previewUrl && (
            <div style={{ width: `${zoom}%`, height: `${zoom}%` }}>
              <img
                src={previewUrl}
                alt={
                  filename
                    ? `Mermaid diagram from ${filename}`
                    : "Mermaid diagram preview"
                }
                className="h-full w-full object-contain"
              />
            </div>
          )}
          {!source.trim() && (
            <div className="text-muted-foreground flex min-h-64 flex-col items-center justify-center gap-4 text-sm">
              <p>
                Open a file or paste Mermaid source below to see your diagram.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  ++fileRequest.current;
                  setFileError("");
                  setFilename("");
                  setSource(SAMPLE);
                  setZoom(100);
                }}
              >
                Try an example
              </Button>
            </div>
          )}
        </div>

        <details
          className="mt-3 shrink-0"
          open={Boolean(renderError) || undefined}
        >
          <summary className="cursor-pointer text-sm font-medium">
            View or edit Mermaid source
          </summary>
          <div className="mt-3 max-h-[35dvh] space-y-2 overflow-auto">
            <Label htmlFor="mermaid-source">Mermaid source</Label>
            <Textarea
              id="mermaid-source"
              value={source}
              maxLength={MAX_FILE_BYTES}
              onChange={(event) => {
                ++fileRequest.current;
                setSource(event.target.value);
              }}
              placeholder="flowchart LR\n    A[Start] --> B[Finish]"
              className="min-h-64 font-mono text-sm"
              spellCheck={false}
            />
          </div>
        </details>
      </div>
    </div>
  );
}
