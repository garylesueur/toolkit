import "reflect-metadata";
import {
  BasicConstraintsExtension,
  ExtendedKeyUsage,
  ExtendedKeyUsageExtension,
  KeyUsageFlags,
  KeyUsagesExtension,
  SubjectAlternativeNameExtension,
  X509Certificate,
} from "@peculiar/x509";

export type CertificateValidity = "valid" | "expired" | "not-yet-valid";

export type CertificateName = {
  type: string;
  value: string;
};

export type CertificateExtensionInfo = {
  critical: boolean;
  name: string;
  oid: string;
};

export type DecodedCertificate = {
  basicConstraints: string;
  extendedKeyUsages: string[];
  extensions: CertificateExtensionInfo[];
  issuer: string;
  issuerIndex: number | null;
  keyUsages: string[];
  notAfter: Date;
  notBefore: Date;
  publicKey: string;
  sans: CertificateName[];
  serialNumber: string;
  sha1: string;
  sha256: string;
  signatureAlgorithm: string;
  subject: string;
  selfIssued: boolean;
  validity: CertificateValidity;
};

const PEM_PATTERN =
  /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g;
const PRIVATE_KEY_PATTERN = /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/;

const KEY_USAGES: Array<[KeyUsageFlags, string]> = [
  [KeyUsageFlags.digitalSignature, "Digital signature"],
  [KeyUsageFlags.nonRepudiation, "Content commitment"],
  [KeyUsageFlags.keyEncipherment, "Key encipherment"],
  [KeyUsageFlags.dataEncipherment, "Data encipherment"],
  [KeyUsageFlags.keyAgreement, "Key agreement"],
  [KeyUsageFlags.keyCertSign, "Certificate signing"],
  [KeyUsageFlags.cRLSign, "CRL signing"],
  [KeyUsageFlags.encipherOnly, "Encipher only"],
  [KeyUsageFlags.decipherOnly, "Decipher only"],
];

const EXTENDED_KEY_USAGES: Record<string, string> = {
  [ExtendedKeyUsage.serverAuth]: "TLS server authentication",
  [ExtendedKeyUsage.clientAuth]: "TLS client authentication",
  [ExtendedKeyUsage.codeSigning]: "Code signing",
  [ExtendedKeyUsage.emailProtection]: "Email protection",
  [ExtendedKeyUsage.timeStamping]: "Time stamping",
  [ExtendedKeyUsage.ocspSigning]: "OCSP signing",
};

const EXTENSION_NAMES: Record<string, string> = {
  "2.5.29.14": "Subject key identifier",
  "2.5.29.15": "Key usage",
  "2.5.29.17": "Subject alternative name",
  "2.5.29.19": "Basic constraints",
  "2.5.29.31": "CRL distribution points",
  "2.5.29.32": "Certificate policies",
  "2.5.29.35": "Authority key identifier",
  "2.5.29.37": "Extended key usage",
  "1.3.6.1.5.5.7.1.1": "Authority information access",
};

export function extractPemCertificates(input: string): string[] {
  if (PRIVATE_KEY_PATTERN.test(input)) {
    throw new Error(
      "Private keys are not accepted. Paste only public CERTIFICATE blocks.",
    );
  }
  const matches = input.match(PEM_PATTERN);
  if (matches?.length) return matches;
  const compact = input.replace(/\s/g, "");
  if (!compact)
    throw new Error("Paste a PEM certificate or choose a certificate file.");
  if (!/^[A-Za-z0-9+/]+=*$/.test(compact)) {
    throw new Error(
      "This does not look like a PEM certificate or Base64 DER certificate.",
    );
  }
  return [compact];
}

export function certificateValidity(
  notBefore: Date,
  notAfter: Date,
  now = new Date(),
): CertificateValidity {
  if (now < notBefore) return "not-yet-valid";
  if (now > notAfter) return "expired";
  return "valid";
}

export function formatFingerprint(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0").toUpperCase(),
  ).join(":");
}

export async function decodeCertificates(
  input: string | ArrayBuffer,
  now = new Date(),
): Promise<DecodedCertificate[]> {
  const encoded =
    typeof input === "string" ? extractPemCertificates(input) : [input];
  const certificates = encoded.map((item) => {
    try {
      return new X509Certificate(item);
    } catch {
      throw new Error(
        "The certificate could not be decoded as X.509 DER data.",
      );
    }
  });

  return Promise.all(
    certificates.map(async (certificate) => {
      const san = certificate.getExtension(SubjectAlternativeNameExtension);
      const keyUsage = certificate.getExtension(KeyUsagesExtension);
      const extendedKeyUsage = certificate.getExtension(
        ExtendedKeyUsageExtension,
      );
      const constraints = certificate.getExtension(BasicConstraintsExtension);
      const [sha1, sha256] = await Promise.all([
        crypto.subtle.digest("SHA-1", certificate.rawData),
        crypto.subtle.digest("SHA-256", certificate.rawData),
      ]);
      const issuerIndex = certificates.findIndex(
        (candidate) => candidate.subject === certificate.issuer,
      );

      return {
        basicConstraints: constraints
          ? constraints.ca
            ? `Certificate authority${
                constraints.pathLength === undefined
                  ? ""
                  : `, path length ${constraints.pathLength}`
              }`
            : "End-entity certificate"
          : "Not specified",
        extendedKeyUsages: extendedKeyUsage
          ? Array.from(
              extendedKeyUsage.usages,
              (usage) => EXTENDED_KEY_USAGES[String(usage)] ?? String(usage),
            )
          : [],
        extensions: Array.from(certificate.extensions, (extension) => ({
          critical: extension.critical,
          name: EXTENSION_NAMES[extension.type] ?? "Unknown extension",
          oid: extension.type,
        })),
        issuer: certificate.issuer,
        issuerIndex: issuerIndex >= 0 ? issuerIndex : null,
        keyUsages: keyUsage
          ? KEY_USAGES.filter(([flag]) => (keyUsage.usages & flag) !== 0).map(
              ([, label]) => label,
            )
          : [],
        notAfter: certificate.notAfter,
        notBefore: certificate.notBefore,
        publicKey: formatPublicKey(certificate.publicKey.algorithm),
        sans: san?.names.toJSON() ?? [],
        serialNumber: certificate.serialNumber.toUpperCase(),
        sha1: formatFingerprint(sha1),
        sha256: formatFingerprint(sha256),
        signatureAlgorithm: formatAlgorithm(certificate.signatureAlgorithm),
        subject: certificate.subject,
        selfIssued: certificate.subject === certificate.issuer,
        validity: certificateValidity(
          certificate.notBefore,
          certificate.notAfter,
          now,
        ),
      };
    }),
  );
}

function formatAlgorithm(algorithm: Algorithm): string {
  const details = algorithm as Algorithm & {
    hash?: Algorithm;
    namedCurve?: string;
  };
  return [details.name, details.hash?.name, details.namedCurve]
    .filter(Boolean)
    .join(" / ");
}

function formatPublicKey(algorithm: Algorithm): string {
  const details = algorithm as Algorithm & {
    modulusLength?: number;
    namedCurve?: string;
  };
  return [
    details.name,
    details.modulusLength ? `${details.modulusLength} bit` : null,
    details.namedCurve,
  ]
    .filter(Boolean)
    .join(" / ");
}
