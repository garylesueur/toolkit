"use client";

import { useState, useMemo } from "react";

import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const LABELS: Record<number, string> = {
  0: "NUL",
  7: "BEL",
  8: "BS",
  9: "TAB",
  10: "LF",
  11: "VT",
  12: "FF",
  13: "CR",
  27: "ESC",
  32: "SP",
  127: "DEL",
  160: "NBSP",
  8203: "ZWS",
  8204: "ZWNJ",
  8205: "ZWJ",
  65279: "BOM",
};

function isNonPrintable(code: number): boolean {
  return code <= 32 || code === 127 || code === 160 || code in LABELS;
}

function formatCode(code: number, hex: boolean): string {
  return hex ? `0x${code.toString(16).toUpperCase()}` : String(code);
}

export default function AsciiCharCodesPage() {
  const [input, setInput] = useState("");
  const [hex, setHex] = useState(false);

  const chars = useMemo(() => {
    return Array.from(input).map((char) => {
      const code = char.codePointAt(0)!;
      const label = LABELS[code];
      return { char, code, label };
    });
  }, [input]);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        ASCII / Char Code Viewer
      </h1>
      <p className="text-muted-foreground mt-1">
        Paste a string to see each character with its numeric code point
        underneath.
      </p>
      <PrivacyBanner>
        Your data is processed entirely in your browser. Nothing is stored,
        logged, or sent to a server.
      </PrivacyBanner>

      <div className="mt-8">
        <label htmlFor="ascii-input" className="sr-only">
          Text to analyse
        </label>
        <Textarea
          id="ascii-input"
          placeholder="Paste or type a string here…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="min-h-24 resize-y"
        />
      </div>

      {input.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-2">
            <Button
              variant={hex ? "default" : "outline"}
              size="sm"
              onClick={() => setHex((h) => !h)}
            >
              {hex ? "Hex" : "Decimal"}
            </Button>
            <span className="text-muted-foreground text-xs">
              {chars.length} character{chars.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex flex-wrap gap-0.5 rounded-md border border-border bg-muted/50 p-3 font-mono">
            {chars.map((c, i) => (
              <div
                key={i}
                className={`flex flex-col items-center px-1.5 py-1 ${
                  isNonPrintable(c.code) ? "rounded bg-destructive/10" : ""
                }`}
              >
                <span className="text-base leading-tight">
                  {c.label ?? c.char}
                </span>
                <span className="text-muted-foreground text-[10px] leading-tight">
                  {formatCode(c.code, hex)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
