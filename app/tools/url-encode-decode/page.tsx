"use client";

import { RiFileCopyLine, RiCheckLine } from "@remixicon/react";
import { useState, useCallback } from "react";

import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useClipboard } from "@/hooks/use-clipboard";

type Direction = "encode" | "decode";

const INPUT_PLACEHOLDER_ENCODE = "Enter text to encode…";
const INPUT_PLACEHOLDER_DECODE = "Paste encoded URL to decode…";
const DECODE_ERROR_MESSAGE = "Malformed URI sequence";

export default function UrlEncodeDecodePage() {
  const [direction, setDirection] = useState<Direction>("encode");
  const [inputText, setInputText] = useState("");

  const handleSetDirection = useCallback(
    (newDirection: Direction) => {
      if (newDirection === direction) return;

      if (direction === "encode") {
        setInputText(encodeURIComponent(inputText));
      } else {
        try {
          setInputText(decodeURIComponent(inputText));
        } catch {
          // Keep input as-is when decode fails
        }
      }
      setDirection(newDirection);
    },
    [direction, inputText],
  );

  let output = "";
  let decodeError: string | null = null;

  if (direction === "encode") {
    output = encodeURIComponent(inputText);
  } else {
    try {
      output = decodeURIComponent(inputText);
    } catch {
      decodeError = DECODE_ERROR_MESSAGE;
    }
  }

  const { copy: handleCopy, copied, error: copyError } = useClipboard(output);

  const placeholder =
    direction === "encode"
      ? INPUT_PLACEHOLDER_ENCODE
      : INPUT_PLACEHOLDER_DECODE;

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">URL Encode / Decode</h1>
      <p className="text-muted-foreground mt-1">
        Percent-encode text for use in URLs, or decode encoded strings back to
        readable text.
      </p>
      <PrivacyBanner>
        Your data is processed entirely in your browser. Nothing is stored,
        logged, or sent to a server.
      </PrivacyBanner>

      {/* Direction toggle */}
      <div className="mt-8 inline-flex overflow-hidden rounded-md border border-border">
        <Button
          type="button"
          variant={direction === "encode" ? "default" : "outline"}
          className="rounded-r-none border-0 border-r border-border"
          onClick={() => handleSetDirection("encode")}
        >
          Encode
        </Button>
        <Button
          type="button"
          variant={direction === "decode" ? "default" : "outline"}
          className="rounded-l-none border-0"
          onClick={() => handleSetDirection("decode")}
        >
          Decode
        </Button>
      </div>

      {copyError && (
        <p role="alert" className="text-destructive text-sm">
          {copyError}
        </p>
      )}

      {/* Input */}
      <div className="mt-6">
        <Label htmlFor="url-input">
          {direction === "encode" ? "Text to encode" : "URL text to decode"}
        </Label>
        <Textarea
          id="url-input"
          placeholder={placeholder}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="min-h-32"
        />
      </div>

      {/* Output */}
      <div className="mt-4">
        <Label htmlFor="url-output">
          {direction === "encode" ? "Encoded URL text" : "Decoded text"}
        </Label>
        <Textarea
          id="url-output"
          value={output}
          readOnly
          className="min-h-32 resize-none"
        />
      </div>

      {decodeError && (
        <p className="mt-2 text-sm text-destructive">{decodeError}</p>
      )}

      {/* Copy button */}
      <div className="mt-4">
        <Button variant="outline" onClick={handleCopy} disabled={!output}>
          {copied ? (
            <RiCheckLine data-icon="inline-start" />
          ) : (
            <RiFileCopyLine data-icon="inline-start" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}
