export type PdfValidationMode = "relaxed" | "strict";

export type PdfCpuCommand = "validate" | "repair";

export function buildPdfCpuArguments(
  command: PdfCpuCommand,
  mode: PdfValidationMode,
): string[] {
  const common = ["--conf", "disable", "--offline"];

  if (command === "validate") {
    return ["pdfcpu", "validate", ...common, "--mode", mode, "/input.pdf"];
  }

  return ["pdfcpu", "optimize", ...common, "/input.pdf", "/output.pdf"];
}

export function cleanPdfCpuLog(log: string): string {
  const ansiColour = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");
  return log
    .replaceAll("/input.pdf", "your PDF")
    .replaceAll("/output.pdf", "repaired PDF")
    .replace(ansiColour, "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line, index, lines) => line || lines[index - 1])
    .join("\n")
    .trim();
}

export function pdfValidationSummary(
  valid: boolean,
  mode: PdfValidationMode,
): string {
  if (valid) {
    return mode === "strict"
      ? "This PDF passed strict PDF 1.7 and basic PDF 2.0 checks."
      : "This PDF passed practical compatibility checks.";
  }

  return mode === "strict"
    ? "This PDF contains one or more specification violations."
    : "This PDF contains structural problems that may affect compatibility.";
}
