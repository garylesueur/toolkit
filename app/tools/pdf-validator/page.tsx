"use client";

import {
  RiAlertLine,
  RiCheckLine,
  RiDownload2Line,
  RiFileShieldLine,
  RiLoader4Line,
  RiRefreshLine,
} from "@remixicon/react";
import { useCallback, useState } from "react";

import { PdfDropZone } from "@/components/pdf/pdf-drop-zone";
import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { downloadPdfBytes } from "@/lib/pdf/download";
import {
  repairPdf,
  validatePdf,
  type PdfHealthStage,
  type PdfRepairResult,
  type PdfValidationResult,
} from "@/lib/pdf/pdf-health";
import {
  pdfValidationSummary,
  type PdfValidationMode,
} from "@/lib/pdf/pdf-health-options";

const STAGE_LABELS: Record<PdfHealthStage, string> = {
  "loading-engine": "Loading the local PDF engine…",
  "validating": "Checking document structure…",
  "repairing": "Rebuilding document structure…",
  "verifying": "Verifying the repaired copy…",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PdfValidatorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<PdfValidationMode>("relaxed");
  const [stage, setStage] = useState<PdfHealthStage | null>(null);
  const [validation, setValidation] = useState<PdfValidationResult | null>(
    null,
  );
  const [repair, setRepair] = useState<PdfRepairResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetResults = useCallback(() => {
    setValidation(null);
    setRepair(null);
    setError(null);
  }, []);

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0] ?? null);
    setValidation(null);
    setRepair(null);
    setError(null);
  }, []);

  const readSource = useCallback(async () => {
    if (!file) throw new Error("Choose a PDF first.");
    return new Uint8Array(await file.arrayBuffer());
  }, [file]);

  const handleValidate = useCallback(async () => {
    setStage("loading-engine");
    resetResults();
    try {
      setValidation(await validatePdf(await readSource(), mode, setStage));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Validation failed.");
    } finally {
      setStage(null);
    }
  }, [mode, readSource, resetResults]);

  const handleRepair = useCallback(async () => {
    setStage("loading-engine");
    setRepair(null);
    setError(null);
    try {
      const source = await readSource();
      const result = await repairPdf(source, mode, setStage);
      setRepair(result);
      setValidation(result.validation);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Repair failed.");
    } finally {
      setStage(null);
    }
  }, [mode, readSource]);

  const handleDownload = useCallback(() => {
    if (!file || !repair) return;
    const base = file.name.replace(/\.pdf$/i, "");
    downloadPdfBytes(repair.bytes, `${base}-repaired.pdf`);
  }, [file, repair]);

  const working = stage !== null;

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        PDF Validator & Repair
      </h1>
      <p className="text-muted-foreground mt-1">
        Check PDF structure and rebuild a cleaner copy when compatibility
        problems are found.
      </p>
      <PrivacyBanner>
        Validation and repair run locally with WebAssembly. Your PDF never
        leaves this browser, and link checking is kept offline.
      </PrivacyBanner>

      <div className="mt-8">
        <PdfDropZone
          onFiles={handleFiles}
          compact={!!file}
          label={file ? "Choose a different PDF" : "Choose a PDF to check"}
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

          <fieldset>
            <legend className="text-sm font-medium">Validation depth</legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {(
                [
                  [
                    "relaxed",
                    "Compatibility",
                    "Recommended. Accepts common real-world deviations.",
                  ],
                  [
                    "strict",
                    "Strict specification",
                    "Flags deviations from PDF 1.7 and basic PDF 2.0 checks.",
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
                  onClick={() => {
                    setMode(value);
                    resetResults();
                  }}
                  disabled={working}
                >
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-muted-foreground mt-1 block text-xs">
                    {description}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          {stage && (
            <output className="overflow-hidden rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center gap-3">
                <RiLoader4Line
                  className="size-5 animate-spin text-primary"
                  aria-hidden
                />
                <p className="text-sm font-medium">{STAGE_LABELS[stage]}</p>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-primary transition-all" />
              </div>
            </output>
          )}

          {validation && (
            <div
              className={`rounded-lg border p-5 ${
                validation.valid
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-amber-500/30 bg-amber-500/5"
              }`}
            >
              <div className="flex items-start gap-3">
                {validation.valid ? (
                  <RiCheckLine
                    className="mt-0.5 size-5 shrink-0 text-emerald-500"
                    aria-hidden
                  />
                ) : (
                  <RiAlertLine
                    className="mt-0.5 size-5 shrink-0 text-amber-500"
                    aria-hidden
                  />
                )}
                <div>
                  <p className="font-medium">
                    {validation.valid
                      ? repair
                        ? "Repaired copy passed validation"
                        : "Validation passed"
                      : "Validation found problems"}
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {pdfValidationSummary(validation.valid, validation.mode)}
                  </p>
                </div>
              </div>
              {validation.log && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium">
                    Technical diagnostics
                  </summary>
                  <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-background/70 p-3 text-xs">
                    {validation.log}
                  </pre>
                </details>
              )}
            </div>
          )}

          {repair && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">Repaired PDF is ready</p>
                <p className="text-muted-foreground mt-1 text-xs tabular-nums">
                  {formatBytes(file.size)} →{" "}
                  {formatBytes(repair.bytes.byteLength)}
                </p>
              </div>
              <Button variant="outline" onClick={handleDownload}>
                <RiDownload2Line data-icon="inline-start" />
                Download repaired PDF
              </Button>
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </p>
          )}

          <p className="text-muted-foreground text-xs">
            Repair rebuilds PDF objects and resources into a new file. Review
            important documents visually, especially forms, signatures, layers,
            and unusual interactive content.
          </p>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setFile(null);
                resetResults();
              }}
              disabled={working}
            >
              Remove PDF
            </Button>
            <Button variant="outline" onClick={handleRepair} disabled={working}>
              <RiRefreshLine data-icon="inline-start" />
              Repair & verify
            </Button>
            <Button onClick={handleValidate} disabled={working}>
              {working ? (
                <RiLoader4Line
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <RiFileShieldLine data-icon="inline-start" />
              )}
              {working ? "Working…" : "Validate PDF"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
