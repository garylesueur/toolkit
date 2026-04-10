"use client";

import { useState, useCallback, useEffect } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PdfPageRangeInputProps = {
  totalPages: number;
  onChange: (pages: number[]) => void;
  label?: string;
};

/** Parse a range string like "1-3, 5, 7-10" into 0-based page indices. */
export function parsePageRanges(
  input: string,
  totalPages: number,
): { pages: number[]; error: string | null } {
  const trimmed = input.trim();
  if (!trimmed) return { pages: [], error: null };

  const pages = new Set<number>();
  const parts = trimmed.split(",");

  for (const part of parts) {
    const range = part.trim();
    if (!range) continue;

    const match = range.match(/^(\d+)\s*-\s*(\d+)$/);
    if (match) {
      const start = parseInt(match[1], 10);
      const end = parseInt(match[2], 10);
      if (start < 1 || end > totalPages || start > end) {
        return {
          pages: [],
          error: `Invalid range "${range}" — pages go from 1 to ${totalPages}.`,
        };
      }
      for (let i = start; i <= end; i++) pages.add(i - 1);
    } else if (/^\d+$/.test(range)) {
      const num = parseInt(range, 10);
      if (num < 1 || num > totalPages) {
        return {
          pages: [],
          error: `Page ${num} is out of range (1–${totalPages}).`,
        };
      }
      pages.add(num - 1);
    } else {
      return { pages: [], error: `Cannot parse "${range}".` };
    }
  }

  return { pages: Array.from(pages).sort((a, b) => a - b), error: null };
}

export function PdfPageRangeInput({
  totalPages,
  onChange,
  label = "Pages",
}: PdfPageRangeInputProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback(
    (input: string) => {
      setValue(input);
      const result = parsePageRanges(input, totalPages);
      setError(result.error);
      if (!result.error) onChange(result.pages);
    },
    [totalPages, onChange],
  );

  // Reset when totalPages changes
  useEffect(() => {
    setValue("");
    setError(null);
  }, [totalPages]);

  return (
    <div>
      <Label>{label}</Label>
      <Input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={`e.g. 1-3, 5, ${totalPages}`}
        className="mt-1.5"
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
