"use client";

import { useState, useCallback, useEffect } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parsePageRanges } from "@/lib/pdf/page-ranges";

export { parsePageRanges } from "@/lib/pdf/page-ranges";

type PdfPageRangeInputProps = {
  totalPages: number;
  onChange: (pages: number[]) => void;
  label?: string;
};

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
