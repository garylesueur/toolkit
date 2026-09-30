"use client";

import {
  RiAlertLine,
  RiFileInfoLine,
  RiFileUploadLine,
  RiLoader4Line,
} from "@remixicon/react";
import { useState } from "react";

import { PrivacyBanner } from "@/components/privacy-banner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { decodeCertificates } from "@/lib/security/certificate-decoder";
import type { DecodedCertificate } from "@/lib/security/certificate-decoder";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function CertificateDecoderPage() {
  const [input, setInput] = useState("");
  const [certificates, setCertificates] = useState<DecodedCertificate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const decode = async (value: string | ArrayBuffer) => {
    setLoading(true);
    setError(null);
    try {
      setCertificates(await decodeCertificates(value));
    } catch (failure) {
      setCertificates([]);
      setError(
        failure instanceof Error
          ? failure.message
          : "The certificate could not be decoded.",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setError("Certificate files must be 5 MB or smaller.");
      setCertificates([]);
      return;
    }
    const bytes = await file.arrayBuffer();
    const startsWithPem = new TextDecoder()
      .decode(bytes.slice(0, 40))
      .includes("-----BEGIN");
    if (startsWithPem) {
      const text = new TextDecoder().decode(bytes);
      setInput(text);
      await decode(text);
    } else {
      setInput("");
      await decode(bytes);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        PEM / Certificate Decoder
      </h1>
      <p className="mt-1 text-muted-foreground">
        Inspect X.509 certificate identity, validity, usages, and fingerprints.
      </p>
      <PrivacyBanner>
        Certificates are decoded and hashed entirely in your browser. No host
        lookup, upload, or revocation request is made.
      </PrivacyBanner>
      <div className="mt-4 flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        <RiAlertLine className="mt-0.5 size-4 shrink-0" />
        <p>
          Decoding is not trust validation. This tool does not check revocation,
          Certificate Transparency, hostname ownership, or whether a root is
          trusted by your device. Do not paste private keys.
        </p>
      </div>

      <section className="mt-8 space-y-3">
        <label htmlFor="certificate-input" className="text-sm font-medium">
          PEM certificate or chain
        </label>
        <Textarea
          id="certificate-input"
          className="min-h-52 font-mono text-xs"
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            setCertificates([]);
            setError(null);
          }}
          placeholder={
            "-----BEGIN CERTIFICATE-----\n…\n-----END CERTIFICATE-----"
          }
          autoCapitalize="none"
          spellCheck={false}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!input.trim() || loading}
            onClick={() => decode(input)}
          >
            {loading ? (
              <RiLoader4Line className="size-4 animate-spin" />
            ) : (
              <RiFileInfoLine className="size-4" />
            )}
            Decode certificate
          </Button>
          <Button variant="outline" asChild>
            <label>
              <RiFileUploadLine className="size-4" />
              Choose PEM, CRT, or CER
              <input
                type="file"
                className="sr-only"
                accept=".pem,.crt,.cer,application/pkix-cert,application/x-x509-ca-cert"
                onChange={(event) => loadFile(event.target.files?.[0])}
              />
            </label>
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </section>

      {certificates.length > 0 && (
        <section className="mt-8 space-y-5">
          <div>
            <h2 className="text-lg font-semibold">
              {certificates.length === 1
                ? "Certificate details"
                : `${certificates.length}-certificate chain`}
            </h2>
            {certificates.length > 1 && (
              <p className="mt-1 text-sm text-muted-foreground">
                Certificates are shown in pasted order. Issuer matches refer
                only to certificates included here; signatures and trust were
                not validated.
              </p>
            )}
          </div>
          {certificates.map((certificate, index) => (
            <CertificateCard
              key={`${certificate.serialNumber}-${index}`}
              certificate={certificate}
              index={index}
            />
          ))}
        </section>
      )}
    </div>
  );
}

type CertificateCardProps = {
  certificate: DecodedCertificate;
  index: number;
};

function CertificateCard({ certificate, index }: CertificateCardProps) {
  const validityLabel =
    certificate.validity === "valid"
      ? "Within validity period"
      : certificate.validity === "expired"
        ? "Expired"
        : "Not yet valid";

  return (
    <article className="overflow-hidden rounded-lg border">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/30 p-4">
        <div>
          <p className="text-xs text-muted-foreground">
            Certificate {index + 1}
          </p>
          <h3 className="mt-1 break-all font-semibold">
            {certificate.subject}
          </h3>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
            certificate.validity === "valid"
              ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
              : "border-destructive/30 bg-destructive/5 text-destructive"
          }`}
        >
          {validityLabel}
        </span>
      </header>

      <dl className="grid gap-x-6 p-4 md:grid-cols-2">
        <Detail label="Subject" value={certificate.subject} />
        <Detail label="Issuer" value={certificate.issuer} />
        <Detail
          label="Valid from"
          value={certificate.notBefore.toLocaleString()}
        />
        <Detail
          label="Valid until"
          value={certificate.notAfter.toLocaleString()}
        />
        <Detail label="Serial number" value={certificate.serialNumber} mono />
        <Detail label="Public key" value={certificate.publicKey} />
        <Detail
          label="Signature algorithm"
          value={certificate.signatureAlgorithm}
        />
        <Detail
          label="Basic constraints"
          value={certificate.basicConstraints}
        />
        <Detail
          label="Issuer match in input"
          value={
            certificate.issuerIndex === null
              ? "Not included"
              : certificate.issuerIndex === index
                ? "Self-issued name"
                : `Certificate ${certificate.issuerIndex + 1}`
          }
        />
      </dl>

      <div className="space-y-4 border-t p-4">
        <ValueList
          title="Subject alternative names"
          values={certificate.sans.map((name) => `${name.type}: ${name.value}`)}
        />
        <ValueList title="Key usage" values={certificate.keyUsages} />
        <ValueList
          title="Extended key usage"
          values={certificate.extendedKeyUsages}
        />
        <div>
          <h4 className="text-sm font-medium">SHA-256 fingerprint</h4>
          <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
            {certificate.sha256}
          </p>
        </div>
        <div>
          <h4 className="text-sm font-medium">SHA-1 fingerprint</h4>
          <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
            {certificate.sha1}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Included for legacy identification only; SHA-1 is not suitable for
            new security designs.
          </p>
        </div>
        <details>
          <summary className="cursor-pointer text-sm font-medium">
            Extensions ({certificate.extensions.length})
          </summary>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {certificate.extensions.map((extension, extensionIndex) => (
              <li key={`${extension.oid}-${extensionIndex}`}>
                {extension.name} ({extension.oid})
                {extension.critical ? " — critical" : ""}
              </li>
            ))}
          </ul>
        </details>
      </div>
    </article>
  );
}

type DetailProps = {
  label: string;
  mono?: boolean;
  value: string;
};

function Detail({ label, value, mono = false }: DetailProps) {
  return (
    <div className="border-b py-3 last:border-b-0 md:nth-last-[-n+2]:border-b-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`mt-1 break-all text-sm ${mono ? "font-mono" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

type ValueListProps = {
  title: string;
  values: string[];
};

function ValueList({ title, values }: ValueListProps) {
  return (
    <div>
      <h4 className="text-sm font-medium">{title}</h4>
      <p className="mt-1 break-all text-sm text-muted-foreground">
        {values.length ? values.join(" · ") : "Not specified"}
      </p>
    </div>
  );
}
