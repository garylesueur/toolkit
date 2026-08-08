export type PdfPermissionPreset = "none" | "print" | "all";

export type ProtectPdfOptions = {
  openPassword: string;
  ownerPassword: string;
  permissions: PdfPermissionPreset;
};

const MAX_PASSWORD_BYTES = 127;

export function validatePdfPassword(password: string, label: string): void {
  if (!password) throw new Error(`${label} is required.`);
  if (new TextEncoder().encode(password).byteLength > MAX_PASSWORD_BYTES) {
    throw new Error(`${label} must be no more than 127 UTF-8 bytes.`);
  }
}

export function validateProtectOptions(options: ProtectPdfOptions): void {
  validatePdfPassword(options.openPassword, "Open password");
  validatePdfPassword(options.ownerPassword, "Owner password");
  if (options.openPassword === options.ownerPassword) {
    throw new Error("Use a different owner password from the open password.");
  }
  if (!(["none", "print", "all"] as const).includes(options.permissions)) {
    throw new Error("Choose a supported permissions preset.");
  }
}

export function buildProtectArguments(options: ProtectPdfOptions): string[] {
  validateProtectOptions(options);
  return [
    "pdfcpu",
    "encrypt",
    "--conf",
    "disable",
    "--offline",
    "--mode",
    "aes",
    "--key",
    "256",
    "--perm",
    options.permissions,
    "--upw",
    options.openPassword,
    "--opw",
    options.ownerPassword,
    "/input.pdf",
    "/output.pdf",
  ];
}

export function buildUnlockArguments(
  password: string,
  passwordKind: "user" | "owner",
): string[] {
  validatePdfPassword(password, "PDF password");
  return [
    "pdfcpu",
    "decrypt",
    "--conf",
    "disable",
    "--offline",
    passwordKind === "user" ? "--upw" : "--opw",
    password,
    "/input.pdf",
    "/output.pdf",
  ];
}

export function protectedPdfName(fileName: string, unlocked: boolean): string {
  const base = fileName.replace(/\.pdf$/i, "");
  return `${base || "document"}-${unlocked ? "unlocked" : "protected"}.pdf`;
}
