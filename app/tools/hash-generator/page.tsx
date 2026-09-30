"use client";

import {
  RiCheckLine,
  RiFileCopyLine,
  RiFileShieldLine,
  RiLoader4Line,
  RiUpload2Line,
} from "@remixicon/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  HASH_ALGORITHMS,
  computeAllHashes,
  hashFile,
  verifyChecksum,
} from "@/lib/hash/generate";
import type { HashAlgorithm, HashResults } from "@/lib/hash/generate";

const COPY_RESET_MS = 2000;

interface HashRowProps {
  label: HashAlgorithm;
  value: string;
  copiedValue: string | null;
  onCopy: (value: string) => void;
}

function HashRow({ label, value, copiedValue, onCopy }: HashRowProps) {
  const isCopied = copiedValue === value;
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border bg-muted/30 px-3 py-2">
      <div className="min-w-0 flex-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <p className="break-all font-mono text-sm">{value}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onCopy(value)}
        disabled={!value}
        aria-label={`Copy ${label} checksum`}
      >
        {isCopied ? <RiCheckLine /> : <RiFileCopyLine />}
      </Button>
    </div>
  );
}

const EMPTY_RESULTS: HashResults = Object.fromEntries(
  HASH_ALGORITHMS.map((algorithm) => [algorithm, ""]),
) as HashResults;

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function HashGeneratorPage() {
  const [mode, setMode] = useState<"text" | "file">("text");
  const [input, setInput] = useState("");
  const [results, setResults] = useState<HashResults>(EMPTY_RESULTS);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>("SHA-256");
  const [fileHash, setFileHash] = useState("");
  const [expected, setExpected] = useState("");
  const [bytesRead, setBytesRead] = useState(0);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const verification = useMemo(
    () => verifyChecksum(fileHash, expected, algorithm),
    [algorithm, expected, fileHash],
  );

  useEffect(() => {
    const text = input;
    if (!text) {
      setResults(EMPTY_RESULTS);
      return;
    }
    let cancelled = false;
    void computeAllHashes(text).then((hashes) => {
      if (!cancelled) setResults(hashes);
    });
    return () => {
      cancelled = true;
    };
  }, [input]);

  const handleCopy = useCallback(async (value: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopiedValue(value);
    setTimeout(() => setCopiedValue(null), COPY_RESET_MS);
  }, []);

  const handleFileHash = useCallback(async () => {
    if (!file) return;
    setWorking(true);
    setBytesRead(0);
    setFileHash("");
    setError(null);
    try {
      setFileHash(
        await hashFile(algorithm, file, (read) => setBytesRead(read)),
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not hash this file.",
      );
    } finally {
      setWorking(false);
    }
  }, [algorithm, file]);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        Hash & Checksum Verifier
      </h1>
      <p className="mt-1 text-muted-foreground">
        Hash text or verify a local file against a published checksum.
      </p>
      <PrivacyBanner>
        Your text and files are hashed entirely in your browser. Nothing is
        stored, logged, or sent to a server.
      </PrivacyBanner>
      <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        A matching checksum confirms that file bytes match the expected digest.
        It does not scan for malware or prove that the publisher is trustworthy.
      </div>

      <div className="mt-6 flex gap-2">
        <Button
          size="sm"
          variant={mode === "text" ? "default" : "outline"}
          onClick={() => setMode("text")}
        >
          Hash text
        </Button>
        <Button
          size="sm"
          variant={mode === "file" ? "default" : "outline"}
          onClick={() => setMode("file")}
        >
          Verify file
        </Button>
      </div>

      {mode === "text" ? (
        <>
          <div className="mt-6">
            <label htmlFor="hash-input" className="sr-only">
              Text to hash
            </label>
            <Textarea
              id="hash-input"
              placeholder="Enter text to hash…"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="min-h-32 resize-y"
            />
          </div>
          <div className="mt-6 space-y-2">
            {HASH_ALGORITHMS.map((item) => (
              <HashRow
                key={item}
                label={item}
                value={results[item]}
                copiedValue={copiedValue}
                onCopy={handleCopy}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="mt-6 space-y-5">
          <Label
            htmlFor="checksum-file"
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center"
          >
            <RiUpload2Line className="mb-2 size-7 text-muted-foreground" />
            <span className="font-medium">
              {file ? file.name : "Choose a file to verify"}
            </span>
            <span className="mt-1 text-sm text-muted-foreground">
              {file
                ? formatBytes(file.size)
                : "Any file type · processed locally"}
            </span>
          </Label>
          <input
            id="checksum-file"
            type="file"
            className="sr-only"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setFileHash("");
              setBytesRead(0);
              setError(null);
            }}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="checksum-algorithm">Algorithm</Label>
              <select
                id="checksum-algorithm"
                value={algorithm}
                onChange={(event) => {
                  setAlgorithm(event.target.value as HashAlgorithm);
                  setFileHash("");
                  setBytesRead(0);
                }}
                className="mt-1.5 h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                {HASH_ALGORITHMS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="expected-checksum">
                Expected checksum (optional)
              </Label>
              <Input
                id="expected-checksum"
                className="mt-1.5 font-mono"
                placeholder="Paste the published digest"
                value={expected}
                onChange={(event) => setExpected(event.target.value)}
              />
            </div>
          </div>

          <Button disabled={!file || working} onClick={handleFileHash}>
            {working ? (
              <RiLoader4Line className="size-4 animate-spin" />
            ) : (
              <RiFileShieldLine className="size-4" />
            )}
            {working ? "Calculating checksum…" : `Calculate ${algorithm}`}
          </Button>
          {working && file && (
            <div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-200"
                  style={{
                    width: `${file.size ? (bytesRead / file.size) * 100 : 100}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Read {formatBytes(bytesRead)} of {formatBytes(file.size)}
              </p>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {fileHash && (
            <div className="space-y-3">
              <HashRow
                label={algorithm}
                value={fileHash}
                copiedValue={copiedValue}
                onCopy={handleCopy}
              />
              {verification === "match" && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 text-sm">
                  <p className="font-medium text-green-700 dark:text-green-300">
                    Checksum matches
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    The file bytes match the expected {algorithm} digest. This
                    is still not a malware scan.
                  </p>
                </div>
              )}
              {verification === "mismatch" && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
                  <p className="font-medium text-destructive">
                    Checksum mismatch
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Do not trust this copy until you confirm the expected digest
                    and download source.
                  </p>
                </div>
              )}
              {verification === "invalid" && (
                <p className="text-sm text-destructive">
                  The expected checksum is not the correct hexadecimal length
                  for
                  {` ${algorithm}`}.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
