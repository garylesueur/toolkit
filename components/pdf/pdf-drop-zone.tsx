"use client";

import { RiUploadCloud2Line } from "@remixicon/react";
import { useState, useRef, useCallback } from "react";

type PdfDropZoneProps = {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  compact?: boolean;
  label?: string;
  sublabel?: string;
};

export function PdfDropZone({
  onFiles,
  multiple = false,
  compact = false,
  label,
  sublabel,
}: PdfDropZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (fileList: FileList) => {
      const files = Array.from(fileList).filter(
        (f) =>
          f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
      );
      if (files.length > 0) onFiles(files);
    },
    [onFiles],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
        compact ? "p-6" : "p-10"
      } ${
        dragOver
          ? "border-primary bg-primary/5"
          : "border-border hover:border-muted-foreground/40"
      }`}
    >
      <div className="flex flex-col items-center gap-2">
        <RiUploadCloud2Line className="text-muted-foreground size-8" />
        <p className="text-sm font-medium">
          {label ??
            (compact
              ? "Drop more PDFs, or click to browse"
              : "Drop your PDF here, or click to browse")}
        </p>
        <p className="text-muted-foreground text-xs">
          {sublabel ??
            (multiple ? "PDF files · Multiple supported" : "PDF file")}
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
          }
          e.target.value = "";
        }}
      />
    </div>
  );
}
