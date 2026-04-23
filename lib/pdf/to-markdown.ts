import type { TextItem } from "pdfjs-dist/types/src/display/api";

let pdfjsLib: typeof import("pdfjs-dist") | null = null;

async function getPdfjs() {
  if (!pdfjsLib) {
    pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }
  return pdfjsLib;
}

export type PdfToMarkdownOptions = {
  detectHeadings?: boolean;
  pageBreaks?: boolean;
};

type Line = {
  text: string;
  fontSize: number;
  y: number;
  x: number;
};

const HEADING_RATIOS = [1.8, 1.5, 1.3, 1.15] as const;
const BULLET_PATTERN = /^[•●■▪◦·]\s*/;
const ORDERED_LIST_PATTERN = /^\d+[.)]\s+/;
const PARAGRAPH_GAP_MULTIPLIER = 1.6;
const LINE_MERGE_TOLERANCE = 2;
const WORD_GAP_POINTS = 1;

/** Convert a PDF's text content into Markdown. Heuristic — based on font size and layout. */
export async function convertPdfToMarkdown(
  bytes: Uint8Array,
  options: PdfToMarkdownOptions = {},
): Promise<string> {
  const { detectHeadings = true, pageBreaks = false } = options;

  const pdfjs = await getPdfjs();
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;

  const pages: Line[][] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items.filter(
      (item): item is TextItem =>
        typeof (item as TextItem).str === "string",
    );
    pages.push(extractLines(items));
  }

  const medianSize = computeMedianFontSize(pages);

  const sections = pages
    .map((lines) => renderPage(lines, medianSize, detectHeadings))
    .filter((section) => section.length > 0);

  const separator = pageBreaks ? "\n\n---\n\n" : "\n\n";
  return sections.join(separator).replace(/\n{3,}/g, "\n\n").trim();
}

function computeMedianFontSize(pages: Line[][]): number {
  const sizes = pages.flatMap((p) => p.map((l) => l.fontSize)).filter((s) => s > 0);
  if (sizes.length === 0) return 12;
  sizes.sort((a, b) => a - b);
  return sizes[Math.floor(sizes.length / 2)];
}

function extractLines(items: TextItem[]): Line[] {
  const grouped = new Map<number, TextItem[]>();

  for (const item of items) {
    if (!item.str) continue;
    const y = Math.round(item.transform[5]);

    let key = y;
    for (const existingY of grouped.keys()) {
      if (Math.abs(existingY - y) <= LINE_MERGE_TOLERANCE) {
        key = existingY;
        break;
      }
    }

    const row = grouped.get(key);
    if (row) {
      row.push(item);
    } else {
      grouped.set(key, [item]);
    }
  }

  const sortedYs = [...grouped.keys()].sort((a, b) => b - a);
  const lines: Line[] = [];

  for (const y of sortedYs) {
    const rowItems = grouped.get(y)!.sort(
      (a, b) => a.transform[4] - b.transform[4],
    );

    let text = "";
    let prevEnd = Number.NEGATIVE_INFINITY;
    let maxFontSize = 0;

    for (const item of rowItems) {
      const x = item.transform[4];
      const fontSize = item.height || Math.abs(item.transform[3]);
      if (fontSize > maxFontSize) maxFontSize = fontSize;

      if (
        prevEnd !== Number.NEGATIVE_INFINITY &&
        x - prevEnd > WORD_GAP_POINTS &&
        !text.endsWith(" ") &&
        !item.str.startsWith(" ")
      ) {
        text += " ";
      }
      text += item.str;
      prevEnd = x + item.width;
    }

    const trimmed = text.replace(/\s+/g, " ").trim();
    if (trimmed.length === 0) continue;

    lines.push({
      text: trimmed,
      fontSize: maxFontSize || 12,
      y,
      x: rowItems[0].transform[4],
    });
  }

  return lines;
}

function renderPage(
  lines: Line[],
  medianSize: number,
  detectHeadings: boolean,
): string {
  const out: string[] = [];
  let paragraphBuffer: string[] = [];
  let lastY: number | null = null;
  let lastLineWasHeading = false;

  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      out.push(paragraphBuffer.join(" "));
      paragraphBuffer = [];
    }
  };

  for (const line of lines) {
    const isHeading = detectHeadings && isLikelyHeading(line, medianSize);
    const yGap = lastY !== null ? lastY - line.y : 0;
    const lineHeight = Math.max(line.fontSize, 6);
    const isParagraphBreak =
      lastY !== null && yGap > lineHeight * PARAGRAPH_GAP_MULTIPLIER;

    const bulletMatch = BULLET_PATTERN.exec(line.text);
    const orderedMatch = ORDERED_LIST_PATTERN.exec(line.text);

    if (isHeading || isParagraphBreak || bulletMatch || orderedMatch || lastLineWasHeading) {
      flushParagraph();
    }

    if (isHeading) {
      const level = headingLevel(line.fontSize, medianSize);
      out.push(`${"#".repeat(level)} ${line.text}`);
      lastLineWasHeading = true;
    } else if (bulletMatch) {
      out.push(`- ${line.text.slice(bulletMatch[0].length)}`);
      lastLineWasHeading = false;
    } else if (orderedMatch) {
      out.push(line.text);
      lastLineWasHeading = false;
    } else {
      paragraphBuffer.push(line.text);
      lastLineWasHeading = false;
    }

    lastY = line.y;
  }

  flushParagraph();

  return out.join("\n\n");
}

function isLikelyHeading(line: Line, medianSize: number): boolean {
  if (line.fontSize <= medianSize * HEADING_RATIOS[HEADING_RATIOS.length - 1]) {
    return false;
  }
  if (line.text.length > 200) return false;
  if (line.text.endsWith(".") && line.text.length > 80) return false;
  return true;
}

function headingLevel(fontSize: number, medianSize: number): number {
  const ratio = fontSize / medianSize;
  for (let i = 0; i < HEADING_RATIOS.length; i++) {
    if (ratio > HEADING_RATIOS[i]) return i + 1;
  }
  return HEADING_RATIOS.length + 1;
}
