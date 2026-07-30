/**
 * Two different coverage problems, handled together.
 *
 * pdfmake ships a *subset* of Roboto: good Latin coverage, but no arrows,
 * ticks, box-drawing marks, emoji, or CJK. The PDF standard fonts (Times,
 * Courier) are narrower still — strictly WinAnsi/cp1252 — and pdfkit silently
 * renders an unrelated glyph for anything outside it, so a minus sign comes out
 * as a quotation mark.
 *
 * Characters with an obvious ASCII reading are substituted; anything else is
 * dropped and reported, so the caller can tell the user what was lost rather
 * than shipping a PDF full of tofu boxes and wrong glyphs.
 */
const SUBSTITUTIONS: Record<string, string> = {
  "→": "->",
  "⇒": "=>",
  "⟶": "-->",
  "↦": "|->",
  "←": "<-",
  "⇐": "<=",
  "⟵": "<--",
  "↔": "<->",
  "↑": "^",
  "↓": "v",
  "✓": "[ok]",
  "✔": "[ok]",
  "✅": "[ok]",
  "✗": "[x]",
  "✘": "[x]",
  "❌": "[x]",
  "⚠": "[!]",
  "ℹ": "[i]",
  "★": "*",
  "☆": "*",
  "▪": "•",
  "▫": "•",
  "◦": "•",
  "‣": "•",
};

/** Applied on top of the above when the run is set in a WinAnsi-only font. */
const WIN_ANSI_SUBSTITUTIONS: Record<string, string> = {
  "−": "-",
  "≠": "!=",
  "≤": "<=",
  "≥": ">=",
  "≈": "~",
  "∞": "inf",
  "·": "-",
  "‰": "o/oo",
};

/**
 * Ranges the bundled Roboto subset cannot render. Deliberately conservative —
 * only ranges that are certainly absent, so ordinary accented Latin, Greek and
 * Cyrillic text is left alone.
 */
const UNSUPPORTED_RANGES: Array<[number, number]> = [
  [0x2190, 0x21ff], // Arrows
  [0x2300, 0x23ff], // Miscellaneous technical
  [0x2500, 0x27bf], // Box drawing, block elements, dingbats
  [0x2b00, 0x2bff], // Miscellaneous symbols and arrows
  [0x3000, 0x9fff], // CJK
  [0xac00, 0xd7af], // Hangul
  [0x1f000, 0x1ffff], // Emoji and pictographs
];

/**
 * The characters cp1252 places in 0x80–0x9F, where Latin-1 has control codes.
 * Everything else WinAnsi can encode is simply a code point below 0x100.
 */
const WIN_ANSI_HIGH = new Set([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030,
  0x0160, 0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022,
  0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
]);

const C1_CONTROL_START = 0x80;
const C1_CONTROL_END = 0x9f;

function isWinAnsiEncodable(codePoint: number): boolean {
  if (codePoint === 0x0a || codePoint === 0x09) return true;
  if (codePoint < C1_CONTROL_START) return codePoint >= 0x20;
  if (codePoint <= C1_CONTROL_END) return false;
  if (codePoint < 0x100) return true;
  return WIN_ANSI_HIGH.has(codePoint);
}

function isUnsupportedByRoboto(codePoint: number): boolean {
  for (const [start, end] of UNSUPPORTED_RANGES) {
    if (codePoint >= start && codePoint <= end) return true;
  }
  return false;
}

export type GlyphSanitisation = {
  text: string;
  /** Characters that were dropped outright, deduplicated for reporting. */
  dropped: string[];
  /** True when at least one character was swapped for an ASCII stand-in. */
  substituted: boolean;
};

export function sanitiseGlyphs(
  text: string,
  winAnsiOnly: boolean,
): GlyphSanitisation {
  let substituted = false;
  const dropped = new Set<string>();
  let result = "";

  // Iterating the string yields whole code points, so astral emoji stay intact.
  for (const char of text) {
    const replacement =
      SUBSTITUTIONS[char] ??
      (winAnsiOnly ? WIN_ANSI_SUBSTITUTIONS[char] : undefined);

    if (replacement !== undefined) {
      result += replacement;
      substituted = true;
      continue;
    }

    const codePoint = char.codePointAt(0);
    if (codePoint === undefined) continue;

    const renderable = winAnsiOnly
      ? isWinAnsiEncodable(codePoint)
      : !isUnsupportedByRoboto(codePoint);

    if (!renderable) {
      dropped.add(char);
      continue;
    }

    result += char;
  }

  return { text: result, dropped: [...dropped], substituted };
}
