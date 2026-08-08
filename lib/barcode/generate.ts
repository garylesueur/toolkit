export type BarcodeKind =
  | "CODE128"
  | "EAN13"
  | "EAN8"
  | "UPC"
  | "CODE39"
  | "ITF14"
  | "codabar";

export interface BarcodeValue {
  value: string;
  checkDigit?: string;
}

function calculateMod10(value: string): string {
  const total = [...value]
    .reverse()
    .reduce(
      (sum, digit, index) => sum + Number(digit) * (index % 2 === 0 ? 3 : 1),
      0,
    );
  return String((10 - (total % 10)) % 10);
}

function normaliseNumeric(
  value: string,
  kind: string,
  dataLength: number,
): BarcodeValue {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${kind} accepts digits only`);
  }

  if (value.length !== dataLength && value.length !== dataLength + 1) {
    throw new Error(
      `${kind} requires ${dataLength} data digits or ${dataLength + 1} digits including its check digit`,
    );
  }

  const data = value.slice(0, dataLength);
  const checkDigit = calculateMod10(data);
  if (value.length === dataLength + 1 && value.at(-1) !== checkDigit) {
    throw new Error(`The ${kind} check digit should be ${checkDigit}`);
  }

  return { value: `${data}${checkDigit}`, checkDigit };
}

export function normaliseBarcodeValue(
  rawValue: string,
  kind: BarcodeKind,
): BarcodeValue {
  const value = rawValue.trim();
  if (!value) throw new Error("Enter a value to generate a barcode");

  switch (kind) {
    case "EAN13":
      return normaliseNumeric(value, "EAN-13", 12);
    case "EAN8":
      return normaliseNumeric(value, "EAN-8", 7);
    case "UPC":
      return normaliseNumeric(value, "UPC-A", 11);
    case "ITF14":
      return normaliseNumeric(value, "ITF-14", 13);
    case "CODE39": {
      const upper = value.toUpperCase();
      if (!/^[0-9A-Z\-. $/+%]+$/.test(upper)) {
        throw new Error(
          "Code 39 accepts letters, digits, spaces, and - . $ / + %",
        );
      }
      if (upper.length > 60)
        throw new Error("Code 39 is limited to 60 characters");
      return { value: upper };
    }
    case "codabar":
      if (!/^[0-9\-$:.+/]+$/.test(value)) {
        throw new Error("Codabar accepts digits and - $ : . + /");
      }
      return { value };
    case "CODE128":
      if (
        ![...value].every((character) => {
          const code = character.charCodeAt(0);
          return code >= 32 && code <= 126;
        })
      ) {
        throw new Error("Code 128 accepts printable ASCII characters only");
      }
      if (value.length > 100) {
        throw new Error("Code 128 is limited to 100 characters");
      }
      return { value };
  }
}
