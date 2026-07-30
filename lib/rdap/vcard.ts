/**
 * RDAP embeds contact details as jCard (RFC 7095): an awkward
 * `["vcard", [[name, params, type, value], …]]` array-of-arrays. This pulls
 * named properties out of it without spraying index arithmetic everywhere.
 */
type JCardProperty = [string, Record<string, unknown>, string, unknown];

function isJCardProperty(value: unknown): value is JCardProperty {
  return (
    Array.isArray(value) && value.length >= 4 && typeof value[0] === "string"
  );
}

function toText(value: unknown): string | null {
  if (typeof value === "string") return value.length > 0 ? value : null;
  // Structured values (e.g. `adr`) arrive as arrays of parts.
  if (Array.isArray(value)) {
    const parts = value.filter(
      (part): part is string => typeof part === "string",
    );
    const joined = parts.filter((part) => part.length > 0).join(", ");
    return joined.length > 0 ? joined : null;
  }
  return null;
}

function properties(vcardArray: unknown): JCardProperty[] {
  if (!Array.isArray(vcardArray) || vcardArray.length < 2) return [];
  const entries = vcardArray[1];
  if (!Array.isArray(entries)) return [];
  return entries.filter(isJCardProperty);
}

export function vcardValue(
  vcardArray: unknown,
  property: string,
): string | null {
  for (const entry of properties(vcardArray)) {
    if (entry[0].toLowerCase() !== property.toLowerCase()) continue;
    const text = toText(entry[3]);
    if (text) return text;
  }
  return null;
}

/** `tel` values arrive as `tel:+44.1234` URIs; strip the scheme for display. */
export function vcardPhone(vcardArray: unknown): string | null {
  const value = vcardValue(vcardArray, "tel");
  return value ? value.replace(/^tel:/i, "") : null;
}
