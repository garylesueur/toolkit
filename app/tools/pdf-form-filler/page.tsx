"use client";

import {
  RiCheckboxCircleLine,
  RiCloseLine,
  RiDownload2Line,
  RiFileEditLine,
  RiLoader4Line,
  RiLockLine,
} from "@remixicon/react";
import { useCallback, useEffect, useState } from "react";

import { PageThumbnailGrid } from "@/components/pdf/page-thumbnail-grid";
import { PdfDropZone } from "@/components/pdf/pdf-drop-zone";
import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePdfDocument } from "@/hooks/use-pdf-document";
import { downloadPdfBytes } from "@/lib/pdf/download";
import { fillPdfForm, inspectPdfForm } from "@/lib/pdf/forms";
import type { PdfFormFieldDescriptor, PdfFormValue } from "@/lib/pdf/forms";

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function PdfFormFillerPage() {
  const {
    pdfBytes,
    thumbnails,
    fileName,
    loading,
    error: loadError,
    loadFile,
    reset,
  } = usePdfDocument();
  const [fields, setFields] = useState<PdfFormFieldDescriptor[]>([]);
  const [values, setValues] = useState<Record<string, PdfFormValue>>({});
  const [inspecting, setInspecting] = useState(false);
  const [flatten, setFlatten] = useState(false);
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pdfBytes) {
      setFields([]);
      setValues({});
      return;
    }
    let active = true;
    setInspecting(true);
    setError(null);
    void inspectPdfForm(pdfBytes)
      .then((inspection) => {
        if (!active) return;
        if (inspection.hasXfa)
          setError(
            "This PDF contains XFA fields, which browsers cannot fill reliably.",
          );
        setFields(inspection.fields);
        setValues(
          Object.fromEntries(
            inspection.fields.map((field) => [field.name, field.value]),
          ),
        );
      })
      .catch((failure) => {
        if (active)
          setError(
            failure instanceof Error
              ? failure.message
              : "Could not inspect the form.",
          );
      })
      .finally(() => {
        if (active) setInspecting(false);
      });
    return () => {
      active = false;
    };
  }, [pdfBytes]);

  const updateValue = (name: string, value: PdfFormValue) => {
    setValues((current) => ({ ...current, [name]: value }));
    setResult(null);
    setError(null);
  };
  const handleFill = useCallback(async () => {
    if (!pdfBytes) return;
    setWorking(true);
    setResult(null);
    setError(null);
    try {
      setResult(await fillPdfForm(pdfBytes, values, flatten));
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not fill this form.",
      );
    } finally {
      setWorking(false);
    }
  }, [flatten, pdfBytes, values]);
  const outputName = `${(fileName ?? "document").replace(/\.pdf$/i, "")}-filled.pdf`;
  const supported = fields.filter(
    (field) => !["button", "signature", "unknown"].includes(field.type),
  );
  const unsupported = fields.filter((field) =>
    ["button", "signature", "unknown"].includes(field.type),
  );

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">PDF Form Filler</h1>
      <p className="text-muted-foreground mt-1">
        Detect and fill interactive PDF form fields without uploading the
        document.
      </p>
      <PrivacyBanner>
        Your PDF and entered values stay entirely in your browser. Nothing is
        uploaded or sent to a server.
      </PrivacyBanner>
      <div className="mt-8">
        <PdfDropZone
          compact={!!pdfBytes}
          label={pdfBytes ? "Choose a different form" : undefined}
          onFiles={(files) => {
            setResult(null);
            setError(null);
            void loadFile(files[0]);
          }}
        />
      </div>
      {(loading || inspecting) && (
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <RiLoader4Line className="size-5 animate-spin" />
          {loading ? "Loading and previewing PDF…" : "Detecting form fields…"}
        </div>
      )}
      {loadError && (
        <p className="mt-4 text-sm text-destructive">{loadError}</p>
      )}
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      {pdfBytes && !loading && !inspecting && (
        <div className="mt-6 space-y-6">
          {fields.length === 0 ? (
            <div className="rounded-lg border p-5 text-sm text-muted-foreground">
              No interactive AcroForm fields were found in this PDF.
            </div>
          ) : (
            <>
              <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
                {supported.map((field) => (
                  <div
                    key={field.name}
                    className={field.type === "options" ? "sm:col-span-2" : ""}
                  >
                    <Label htmlFor={`field-${field.name}`}>
                      {field.name}
                      {field.required ? " *" : ""}
                    </Label>
                    {field.type === "text" && (
                      <Input
                        id={`field-${field.name}`}
                        value={String(values[field.name] ?? "")}
                        disabled={field.readOnly}
                        onChange={(e) =>
                          updateValue(field.name, e.target.value)
                        }
                        className="mt-1.5"
                      />
                    )}
                    {field.type === "checkbox" && (
                      <label className="mt-2 flex items-center gap-2 text-sm">
                        <input
                          id={`field-${field.name}`}
                          type="checkbox"
                          checked={Boolean(values[field.name])}
                          disabled={field.readOnly}
                          onChange={(e) =>
                            updateValue(field.name, e.target.checked)
                          }
                          className="size-4 accent-primary"
                        />
                        Checked
                      </label>
                    )}
                    {(field.type === "dropdown" || field.type === "radio") && (
                      <select
                        id={`field-${field.name}`}
                        value={String(values[field.name] ?? "")}
                        disabled={field.readOnly}
                        onChange={(e) =>
                          updateValue(field.name, e.target.value)
                        }
                        className="mt-1.5 h-9 w-full rounded-md border bg-background px-3 text-sm"
                      >
                        <option value="">Choose…</option>
                        {field.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    )}
                    {field.type === "options" && (
                      <select
                        id={`field-${field.name}`}
                        multiple
                        value={
                          Array.isArray(values[field.name])
                            ? (values[field.name] as string[])
                            : []
                        }
                        disabled={field.readOnly}
                        onChange={(e) =>
                          updateValue(
                            field.name,
                            Array.from(
                              e.target.selectedOptions,
                              (option) => option.value,
                            ),
                          )
                        }
                        className="mt-1.5 min-h-28 w-full rounded-md border bg-background p-2 text-sm"
                      >
                        {field.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    )}
                    {field.readOnly && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Read only
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {unsupported.length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
                  <p className="font-medium">
                    Some fields cannot be edited here
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {unsupported
                      .map((field) => `${field.name} (${field.type})`)
                      .join(", ")}
                    . Signature and push-button fields are preserved unchanged.
                  </p>
                </div>
              )}
              <label
                htmlFor="flatten-form"
                className="flex items-start gap-3 rounded-lg border p-4"
              >
                <span className="sr-only">Flatten form after filling</span>
                <input
                  id="flatten-form"
                  type="checkbox"
                  checked={flatten}
                  onChange={(e) => {
                    setFlatten(e.target.checked);
                    setResult(null);
                  }}
                  className="mt-0.5 size-4 accent-primary"
                />
                <span>
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {flatten ? (
                      <RiLockLine className="size-4" />
                    ) : (
                      <RiCheckboxCircleLine className="size-4" />
                    )}
                    Flatten after filling
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Makes the filled appearance permanent and removes all
                    interactive fields. This cannot be undone in the downloaded
                    copy.
                  </span>
                </span>
              </label>
            </>
          )}
          {thumbnails.length > 0 && (
            <PageThumbnailGrid thumbnails={thumbnails} />
          )}
          {working && (
            <div className="flex items-center justify-center gap-2 rounded-lg border bg-muted/20 p-4 text-sm">
              <RiLoader4Line className="size-4 animate-spin" />
              Updating field appearances…
            </div>
          )}
          {result && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div>
                <p className="font-medium">Your filled PDF is ready</p>
                <p className="text-sm text-muted-foreground">
                  {supported.length} supported field
                  {supported.length === 1 ? "" : "s"} ·{" "}
                  {formatBytes(result.byteLength)}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => downloadPdfBytes(result, outputName)}
              >
                <RiDownload2Line data-icon="inline-start" />
                Download PDF
              </Button>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={working}
              onClick={() => {
                reset();
                setFields([]);
                setValues({});
                setResult(null);
                setError(null);
              }}
            >
              <RiCloseLine data-icon="inline-start" />
              Remove PDF
            </Button>
            <Button
              disabled={working || supported.length === 0 || !!error}
              onClick={() => void handleFill()}
            >
              {working ? (
                <RiLoader4Line
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <RiFileEditLine data-icon="inline-start" />
              )}
              {working ? "Filling form…" : "Create filled PDF"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
