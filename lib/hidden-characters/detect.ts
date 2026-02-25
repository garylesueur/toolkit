export interface HiddenCharEntry {
  codePoint: number
  label: string
}

/**
 * Map of Unicode code points to human-readable labels for invisible
 * or non-printing characters that commonly cause debugging headaches.
 */
const HIDDEN_CHAR_MAP: Map<number, string> = new Map([
  [0x0000, "NULL"],
  [0x0001, "SOH"],
  [0x0002, "STX"],
  [0x0003, "ETX"],
  [0x0004, "EOT"],
  [0x0005, "ENQ"],
  [0x0006, "ACK"],
  [0x0007, "BEL"],
  [0x0008, "BS"],
  [0x000b, "VT"],
  [0x000c, "FF"],
  [0x000e, "SO"],
  [0x000f, "SI"],
  [0x0010, "DLE"],
  [0x0011, "DC1"],
  [0x0012, "DC2"],
  [0x0013, "DC3"],
  [0x0014, "DC4"],
  [0x0015, "NAK"],
  [0x0016, "SYN"],
  [0x0017, "ETB"],
  [0x0018, "CAN"],
  [0x0019, "EM"],
  [0x001a, "SUB"],
  [0x001b, "ESC"],
  [0x001c, "FS"],
  [0x001d, "GS"],
  [0x001e, "RS"],
  [0x001f, "US"],
  [0x007f, "DEL"],
  [0x00a0, "NBSP"],
  [0x00ad, "SHY"],
  [0x034f, "CGJ"],
  [0x061c, "ALM"],
  [0x115f, "HCF"],
  [0x1160, "HJF"],
  [0x180e, "MVS"],
  [0x200b, "ZWSP"],
  [0x200c, "ZWNJ"],
  [0x200d, "ZWJ"],
  [0x200e, "LRM"],
  [0x200f, "RLM"],
  [0x202a, "LRE"],
  [0x202b, "RLE"],
  [0x202c, "PDF"],
  [0x202d, "LRO"],
  [0x202e, "RLO"],
  [0x2060, "WJ"],
  [0x2061, "FA"],
  [0x2062, "IT"],
  [0x2063, "IS"],
  [0x2064, "IP"],
  [0x2066, "LRI"],
  [0x2067, "RLI"],
  [0x2068, "FSI"],
  [0x2069, "PDI"],
  [0x206a, "ISS"],
  [0x206b, "ASS"],
  [0x206c, "IAFS"],
  [0x206d, "AAFS"],
  [0x206e, "NADS"],
  [0x206f, "NODS"],
  [0xfeff, "BOM"],
  [0xfff9, "IAA"],
  [0xfffa, "IAS"],
  [0xfffb, "IAT"],
  [0xfffc, "OBJ"],
])

/**
 * Returns the label for a hidden character, or `null` if the character
 * is not considered hidden/invisible.
 */
export function getHiddenCharLabel(codePoint: number): string | null {
  return HIDDEN_CHAR_MAP.get(codePoint) ?? null
}

export interface TextSegment {
  text: string
  hidden: HiddenCharEntry | null
}

/**
 * Splits the input string into segments of visible text and hidden character
 * markers. Each hidden character gets its own segment with a label.
 */
export function analyseText(input: string): TextSegment[] {
  if (!input) return []

  const segments: TextSegment[] = []
  let visibleBuffer = ""

  const flushVisible = () => {
    if (visibleBuffer) {
      segments.push({ text: visibleBuffer, hidden: null })
      visibleBuffer = ""
    }
  }

  for (const char of input) {
    const codePoint = char.codePointAt(0)
    if (codePoint === undefined) continue

    const label = getHiddenCharLabel(codePoint)
    if (label) {
      flushVisible()
      segments.push({
        text: char,
        hidden: { codePoint, label },
      })
    } else {
      visibleBuffer += char
    }
  }

  flushVisible()
  return segments
}

/**
 * Counts the total number of hidden characters in the given segments.
 */
export function countHidden(segments: TextSegment[]): number {
  let count = 0
  for (const segment of segments) {
    if (segment.hidden) count++
  }
  return count
}
