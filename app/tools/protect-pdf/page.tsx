"use client";

import {
  RiDownload2Line,
  RiKey2Line,
  RiLoader4Line,
  RiLockPasswordLine,
  RiShieldCheckLine,
} from "@remixicon/react";
import { useCallback, useState } from "react";

import { PdfDropZone } from "@/components/pdf/pdf-drop-zone";
import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { downloadPdfBytes } from "@/lib/pdf/download";
import {
  protectPdf,
  unlockPdf,
  type PdfPasswordStage,
} from "@/lib/pdf/pdf-password";
import {
  protectedPdfName,
  type PdfPermissionPreset,
} from "@/lib/pdf/pdf-password-options";

type Mode = "protect" | "unlock";

const STAGE_LABELS: Record<PdfPasswordStage, string> = {
  "loading-engine": "Loading the local encryption engine…",
  "protecting": "Encrypting with AES-256…",
  "unlocking": "Removing password protection…",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProtectPdfPage() {
  const [mode, setMode] = useState<Mode>("protect");
  const [file, setFile] = useState<File | null>(null);
  const [openPassword, setOpenPassword] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [unlockPassword, setUnlockPassword] = useState("");
  const [permissions, setPermissions] = useState<PdfPermissionPreset>("none");
  const [stage, setStage] = useState<PdfPasswordStage | null>(null);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0] ?? null);
    setResult(null);
    setError(null);
  }, []);

  const handleProcess = useCallback(async () => {
    if (!file) return;
    setStage("loading-engine");
    resetResult();
    try {
      const source = new Uint8Array(await file.arrayBuffer());
      setResult(
        mode === "protect"
          ? await protectPdf(
              source,
              { openPassword, ownerPassword, permissions },
              setStage,
            )
          : await unlockPdf(source, unlockPassword, setStage),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The PDF could not be processed.",
      );
    } finally {
      setStage(null);
    }
  }, [
    file,
    mode,
    openPassword,
    ownerPassword,
    permissions,
    resetResult,
    unlockPassword,
  ]);

  const working = stage !== null;

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        Protect & Unlock PDF
      </h1>
      <p className="text-muted-foreground mt-1">
        Add AES-256 open-password protection or remove protection from a PDF you
        can access.
      </p>
      <PrivacyBanner>
        Encryption runs locally in a disposable WebAssembly worker. Your PDF and
        passwords never leave this browser.
      </PrivacyBanner>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {(
          [
            ["protect", "Protect PDF", "Require a password to open the file."],
            [
              "unlock",
              "Unlock PDF",
              "Create a copy without password protection.",
            ],
          ] as const
        ).map(([value, label, description]) => (
          <button
            key={value}
            type="button"
            className={`rounded-lg border p-4 text-left transition-colors ${
              mode === value
                ? "border-primary bg-primary/5"
                : "hover:border-foreground/20"
            }`}
            aria-pressed={mode === value}
            disabled={working}
            onClick={() => {
              setMode(value);
              resetResult();
            }}
          >
            <span className="text-sm font-medium">{label}</span>
            <span className="text-muted-foreground mt-1 block text-xs">
              {description}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6">
        <PdfDropZone
          onFiles={handleFiles}
          compact={!!file}
          label={file ? "Choose a different PDF" : undefined}
        />
      </div>

      {file && (
        <div className="mt-6 space-y-5">
          <div className="rounded-lg border p-4">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-muted-foreground mt-1 text-xs tabular-nums">
              {formatBytes(file.size)}
            </p>
          </div>

          {mode === "protect" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="open-password">Open password</Label>
                <Input
                  id="open-password"
                  type="password"
                  autoComplete="new-password"
                  value={openPassword}
                  onChange={(event) => {
                    setOpenPassword(event.target.value);
                    resetResult();
                  }}
                  placeholder="Required to open the PDF"
                />
                <p className="text-muted-foreground text-xs">
                  Share this with people who should read the document.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner-password">Owner password</Label>
                <Input
                  id="owner-password"
                  type="password"
                  autoComplete="new-password"
                  value={ownerPassword}
                  onChange={(event) => {
                    setOwnerPassword(event.target.value);
                    resetResult();
                  }}
                  placeholder="Different administrative password"
                />
                <p className="text-muted-foreground text-xs">
                  Keep this separate; it controls permissions and unlocking.
                </p>
              </div>
              <fieldset className="sm:col-span-2">
                <legend className="text-sm font-medium">
                  Reader permissions
                </legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {(
                    [
                      ["none", "Restricted", "No optional actions"],
                      ["print", "Printing", "Allow printing only"],
                      ["all", "Full access", "Allow reader operations"],
                    ] as const
                  ).map(([value, label, description]) => (
                    <button
                      key={value}
                      type="button"
                      className={`rounded-md border p-3 text-left ${
                        permissions === value
                          ? "border-primary bg-primary/5"
                          : "hover:border-foreground/20"
                      }`}
                      aria-pressed={permissions === value}
                      onClick={() => {
                        setPermissions(value);
                        resetResult();
                      }}
                    >
                      <span className="block text-sm font-medium">{label}</span>
                      <span className="text-muted-foreground mt-1 block text-xs">
                        {description}
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="unlock-password">PDF password</Label>
              <Input
                id="unlock-password"
                type="password"
                autoComplete="current-password"
                value={unlockPassword}
                onChange={(event) => {
                  setUnlockPassword(event.target.value);
                  resetResult();
                }}
                placeholder="Open or owner password"
              />
              <p className="text-muted-foreground text-xs">
                The local engine safely tries the password as either PDF role.
              </p>
            </div>
          )}

          {stage && (
            <output className="block overflow-hidden rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center gap-3">
                <RiLoader4Line
                  className="size-5 animate-spin text-primary"
                  aria-hidden
                />
                <p className="text-sm font-medium">{STAGE_LABELS[stage]}</p>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
              </div>
            </output>
          )}

          {result && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <div className="flex items-start gap-3">
                <RiShieldCheckLine
                  className="mt-0.5 size-5 text-emerald-500"
                  aria-hidden
                />
                <div>
                  <p className="text-sm font-medium">
                    {mode === "protect"
                      ? "AES-256 protected PDF is ready"
                      : "Unlocked PDF is ready"}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs tabular-nums">
                    {formatBytes(file.size)} → {formatBytes(result.byteLength)}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() =>
                  downloadPdfBytes(
                    result,
                    protectedPdfName(file.name, mode === "unlock"),
                  )
                }
              >
                <RiDownload2Line data-icon="inline-start" />
                Download {mode === "protect" ? "protected" : "unlocked"} PDF
              </Button>
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </p>
          )}

          <p className="text-muted-foreground text-xs">
            PDF permissions depend on reader support and are not digital-rights
            management. Password protection cannot recover a forgotten password.
          </p>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              disabled={working}
              onClick={() => {
                setFile(null);
                resetResult();
              }}
            >
              Remove PDF
            </Button>
            <Button onClick={handleProcess} disabled={working}>
              {working ? (
                <RiLoader4Line
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : mode === "protect" ? (
                <RiLockPasswordLine data-icon="inline-start" />
              ) : (
                <RiKey2Line data-icon="inline-start" />
              )}
              {working
                ? "Working…"
                : mode === "protect"
                  ? "Protect PDF"
                  : "Unlock PDF"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
