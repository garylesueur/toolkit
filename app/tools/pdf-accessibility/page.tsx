"use client";

import {
  RiAccessibilityLine,
  RiAlertLine,
  RiCheckboxCircleLine,
  RiDownload2Line,
  RiErrorWarningLine,
  RiEyeLine,
  RiLoader4Line,
} from "@remixicon/react";
import { useCallback, useState } from "react";

import { PdfDropZone } from "@/components/pdf/pdf-drop-zone";
import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import {
  analysePdfAccessibility,
  type AccessibilityFinding,
  type PdfAccessibilityReport,
} from "@/lib/pdf/accessibility";

const STATUS = {
  error: {
    label: "Blocker",
    plural: "Blockers",
    icon: RiAlertLine,
    colour: "text-red-500",
    panel: "border-red-500/30 bg-red-500/5",
  },
  warning: {
    label: "Advisory",
    plural: "Advisories",
    icon: RiErrorWarningLine,
    colour: "text-amber-500",
    panel: "border-amber-500/30 bg-amber-500/5",
  },
  pass: {
    label: "Passed",
    plural: "Passed",
    icon: RiCheckboxCircleLine,
    colour: "text-emerald-500",
    panel: "border-emerald-500/30 bg-emerald-500/5",
  },
  manual: {
    label: "Manual review",
    plural: "Manual reviews",
    icon: RiEyeLine,
    colour: "text-sky-500",
    panel: "border-sky-500/30 bg-sky-500/5",
  },
} as const;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadReport(
  report: PdfAccessibilityReport,
  fileName: string,
): void {
  const base = fileName.replace(/\.pdf$/i, "");
  const payload = {
    file: fileName,
    generatedAt: new Date().toISOString(),
    ...report,
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${base}-accessibility-structure-report.json`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function FindingRow({ item }: { item: AccessibilityFinding }) {
  const settings = STATUS[item.status];
  const Icon = settings.icon;
  return (
    <li className="flex items-start gap-3 border-b py-3 last:border-b-0">
      <Icon
        className={`mt-0.5 size-5 shrink-0 ${settings.colour}`}
        aria-hidden
      />
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{item.title}</p>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
            {settings.label}
          </span>
        </div>
        <p className="text-muted-foreground mt-1 text-xs leading-5">
          {item.detail}
        </p>
      </div>
    </li>
  );
}

export default function PdfAccessibilityPage() {
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<PdfAccessibilityReport | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0] ?? null);
    setReport(null);
    setError(null);
  }, []);

  const handleCheck = useCallback(async () => {
    if (!file) return;
    setWorking(true);
    setReport(null);
    setError(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      setReport(await analysePdfAccessibility(bytes));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The accessibility structure check failed.",
      );
    } finally {
      setWorking(false);
    }
  }, [file]);

  const headline = report
    ? report.summary.error > 0
      ? "Structural accessibility blockers found"
      : report.summary.warning > 0
        ? "No structural blockers; advisories remain"
        : "Automatic structure checks passed"
    : "";

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        PDF Accessibility Structure Checker
      </h1>
      <p className="text-muted-foreground mt-1">
        Preflight tags, language, title, figures, form labels, and links without
        uploading the document.
      </p>
      <PrivacyBanner>
        Your PDF is parsed entirely in this browser. No file content or check
        result is sent anywhere.
      </PrivacyBanner>

      <div className="mt-6 rounded-lg border border-sky-500/30 bg-sky-500/5 p-4">
        <div className="flex items-start gap-3">
          <RiAccessibilityLine
            className="mt-0.5 size-5 shrink-0 text-sky-500"
            aria-hidden
          />
          <div>
            <p className="text-sm font-medium">
              Structural preflight, not accessibility certification
            </p>
            <p className="text-muted-foreground mt-1 text-xs leading-5">
              Passing these checks does not prove PDF/UA or WCAG conformance.
              Reading order, contrast, reflow, and the quality of labels and
              alternatives still need human and assistive-technology testing.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <PdfDropZone
          compact={!!file}
          label={file ? "Choose a different PDF" : "Choose a PDF to preflight"}
          onFiles={handleFiles}
        />
      </div>

      {file && (
        <div className="mt-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-muted-foreground mt-1 text-xs tabular-nums">
                {formatBytes(file.size)}
              </p>
            </div>
            <Button onClick={handleCheck} disabled={working}>
              {working ? (
                <RiLoader4Line
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <RiAccessibilityLine data-icon="inline-start" />
              )}
              {working
                ? "Checking local structure…"
                : "Check accessibility structure"}
            </Button>
          </div>

          {working && (
            <output className="block overflow-hidden rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center gap-3 text-sm font-medium">
                <RiLoader4Line className="size-5 animate-spin text-primary" />
                Parsing tags, annotations, and document metadata…
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
              </div>
            </output>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {report && (
            <div className="space-y-5" aria-live="polite">
              <section className="rounded-lg border p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{headline}</h2>
                    <p className="text-muted-foreground mt-1 max-w-2xl text-xs leading-5">
                      {report.scope}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => downloadReport(report, file.name)}
                  >
                    <RiDownload2Line data-icon="inline-start" />
                    Download JSON report
                  </Button>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(["error", "warning", "pass", "manual"] as const).map(
                    (status) => {
                      const settings = STATUS[status];
                      return (
                        <div
                          key={status}
                          className={`rounded-lg border p-3 ${settings.panel}`}
                        >
                          <p className="text-2xl font-semibold tabular-nums">
                            {report.summary[status]}
                          </p>
                          <p className="text-muted-foreground mt-1 text-xs">
                            {settings.plural}
                          </p>
                        </div>
                      );
                    },
                  )}
                </div>
              </section>

              <section className="rounded-lg border p-5">
                <h2 className="font-semibold">Document facts</h2>
                <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 text-sm sm:grid-cols-4">
                  {[
                    ["Pages", report.facts.pages],
                    ["Tagged", report.facts.tagged ? "Yes" : "No"],
                    ["Language", report.facts.language ?? "Not declared"],
                    ["Title", report.facts.title ?? "Not declared"],
                    ["Structure elements", report.facts.structuredElements],
                    ["Tagged figures", report.facts.figures],
                    ["Form fields", report.facts.formFields],
                    ["Link annotations", report.facts.linkAnnotations],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-muted-foreground text-xs">{label}</dt>
                      <dd className="mt-1 break-words font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {(["error", "warning", "pass", "manual"] as const).map(
                (status) => {
                  const items = report.findings.filter(
                    (item) => item.status === status,
                  );
                  if (!items.length) return null;
                  return (
                    <section key={status} className="rounded-lg border p-5">
                      <h2 className="font-semibold">{STATUS[status].plural}</h2>
                      <ul className="mt-2">
                        {items.map((item) => (
                          <FindingRow key={item.id} item={item} />
                        ))}
                      </ul>
                    </section>
                  );
                },
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
