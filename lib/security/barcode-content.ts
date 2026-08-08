export type DecodedContentKind =
  | "URL"
  | "Email"
  | "Phone"
  | "Wi-Fi configuration"
  | "Contact card"
  | "Text";

export type DecodedBarcodeContent = {
  kind: DecodedContentKind;
  openableUrl: string | null;
  text: string;
  warning: string | null;
};

export function classifyBarcodeContent(text: string): DecodedBarcodeContent {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      kind: "Text",
      openableUrl: null,
      text,
      warning: "The barcode decoded to an empty value.",
    };
  }

  const url = parseWebUrl(trimmed);
  if (url) {
    return {
      kind: "URL",
      openableUrl: url.href,
      text: trimmed,
      warning:
        url.protocol === "http:"
          ? "This link uses unencrypted HTTP. Inspect the destination before opening it."
          : "A barcode can hide its destination. Inspect the full hostname before opening it.",
    };
  }
  if (/^WIFI:/i.test(trimmed)) {
    return {
      kind: "Wi-Fi configuration",
      openableUrl: null,
      text: trimmed,
      warning:
        "This value may contain a Wi-Fi password. Avoid sharing screenshots or copies.",
    };
  }
  if (/^(?:BEGIN:VCARD|MECARD:)/i.test(trimmed)) {
    return {
      kind: "Contact card",
      openableUrl: null,
      text: trimmed,
      warning:
        "Review contact details before importing them into another application.",
    };
  }
  if (/^mailto:/i.test(trimmed)) {
    return {
      kind: "Email",
      openableUrl: null,
      text: trimmed,
      warning:
        "Review the recipient, subject, and message before sending anything.",
    };
  }
  if (/^tel:/i.test(trimmed)) {
    return {
      kind: "Phone",
      openableUrl: null,
      text: trimmed,
      warning: "Review the full number before placing a call.",
    };
  }
  return { kind: "Text", openableUrl: null, text, warning: null };
}

export function friendlyBarcodeFormat(format: string): string {
  return format
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function parseWebUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}
