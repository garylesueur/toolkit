import type { RemixiconComponentType } from "@remixicon/react";
import {
  RiAccessibilityLine,
  RiAspectRatioLine,
  RiBracesLine,
  RiCalendar2Line,
  RiCalendarEventLine,
  RiCalendarLine,
  RiCalendarScheduleLine,
  RiCharacterRecognitionLine,
  RiCodeLine,
  RiCollapseDiagonalLine,
  RiComputerLine,
  RiDatabase2Line,
  RiDeleteBin6Line,
  RiDragMove2Line,
  RiEarthLine,
  RiEyeLine,
  RiFileCodeLine,
  RiFileImageLine,
  RiFileInfoLine,
  RiFileListLine,
  RiFileReduceLine,
  RiFileShieldLine,
  RiFileTextLine,
  RiFindReplaceLine,
  RiFingerprintLine,
  RiFontSize,
  RiFullscreenLine,
  RiGitMergeLine,
  RiGlobalLine,
  RiHashtag,
  RiHourglassLine,
  RiImageAddLine,
  RiImageFill,
  RiKey2Line,
  RiLink,
  RiLinksLine,
  RiLockLine,
  RiLockPasswordLine,
  RiMarkdownLine,
  RiMergeCellsVertical,
  RiPaletteLine,
  RiPuzzleLine,
  RiQrCodeLine,
  RiRotateLockLine,
  RiRouterLine,
  RiRulerLine,
  RiScissorsCutLine,
  RiServerLine,
  RiShieldKeyholeLine,
  RiSortAsc,
  RiTableLine,
  RiTextBlock,
  RiTimeLine,
  RiMagicLine,
  RiShape2Line,
} from "@remixicon/react";

export type Tool = {
  name: string;
  description: string;
  href: string;
  icon: RemixiconComponentType;
  tags: string[];
  devOnly?: boolean;
  dateAdded?: string;
};

const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;

export function isNewTool(tool: Tool): boolean {
  if (!tool.dateAdded) return false;
  const added = new Date(tool.dateAdded).getTime();
  return Date.now() - added < THREE_MONTHS_MS;
}

export const tools: Tool[] = [
  {
    name: "ID Generator",
    description:
      "Generate UUIDs, short IDs, NanoIDs, and ULIDs with one click.",
    href: "/tools/id-generator",
    icon: RiFingerprintLine,
    tags: ["generation", "dev-utils"],
    dateAdded: "2026-02-25",
  },
  {
    name: "Base64 Encode / Decode",
    description: "Encode text to Base64 or decode Base64 back to text.",
    href: "/tools/base64",
    icon: RiFileCodeLine,
    tags: ["encoding", "conversion"],
    dateAdded: "2026-02-25",
  },
  {
    name: "URL Encode / Decode",
    description: "Percent-encode text for URLs or decode encoded strings.",
    href: "/tools/url-encode-decode",
    icon: RiLink,
    tags: ["encoding", "conversion", "seo"],
    dateAdded: "2026-02-25",
  },
  {
    name: "HTML Entities",
    description: "Convert special characters to HTML entities and back.",
    href: "/tools/html-entities",
    icon: RiCodeLine,
    tags: ["encoding", "conversion", "text"],
    dateAdded: "2026-02-25",
  },
  {
    name: "Lorem Ipsum Generator",
    description:
      "Generate placeholder text in paragraphs, sentences, or words.",
    href: "/tools/lorem-ipsum",
    icon: RiTextBlock,
    tags: ["text", "generation"],
    dateAdded: "2026-02-25",
  },
  {
    name: "Unix Timestamp Converter",
    description: "Convert between Unix timestamps and human-readable dates.",
    href: "/tools/unix-timestamp",
    icon: RiTimeLine,
    tags: ["date-time", "conversion"],
    dateAdded: "2026-02-25",
  },
  {
    name: "Character & Word Counter",
    description:
      "Count characters, words, sentences, lines, and bytes in your text.",
    href: "/tools/character-counter",
    icon: RiCharacterRecognitionLine,
    tags: ["text", "data"],
    dateAdded: "2026-02-25",
  },
  {
    name: "Favicon Generator",
    description:
      "Upload a square PNG and get every favicon size your site needs.",
    href: "/tools/favicon-generator",
    icon: RiImageFill,
    tags: ["image", "generation", "seo"],
    dateAdded: "2026-02-25",
  },
  {
    name: "Chrome Extension Icons",
    description:
      "Upload a PNG and get every icon size a Chrome extension needs.",
    href: "/tools/chrome-extension-icons",
    icon: RiPuzzleLine,
    tags: ["image", "generation", "dev-utils"],
    dateAdded: "2026-02-25",
  },
  {
    name: "OG Preview",
    description:
      "Inspect Open Graph tags and preview how your link looks on social platforms.",
    href: "/tools/og-preview",
    icon: RiGlobalLine,
    tags: ["seo", "network"],
    dateAdded: "2026-02-25",
  },
  {
    name: "JSON Formatter",
    description: "Pretty-print and validate JSON with clear error messages.",
    href: "/tools/json-formatter",
    icon: RiBracesLine,
    tags: ["formatting", "data", "dev-utils"],
    dateAdded: "2026-02-25",
  },
  {
    name: "JWT Decoder",
    description: "Decode JWT headers and payloads — no secret needed.",
    href: "/tools/jwt-decoder",
    icon: RiKey2Line,
    tags: ["security", "encoding", "dev-utils"],
    dateAdded: "2026-02-25",
  },
  {
    name: "Colour Converter",
    description:
      "Convert colours between hex, RGB, and HSL with a live preview.",
    href: "/tools/colour-converter",
    icon: RiPaletteLine,
    tags: ["colour", "conversion"],
    dateAdded: "2026-02-25",
  },
  {
    name: "WCAG Contrast Checker",
    description:
      "Check text and background contrast ratio against WCAG 2.1 AA and AAA thresholds.",
    href: "/tools/contrast-checker",
    icon: RiAccessibilityLine,
    tags: ["colour", "seo", "dev-utils"],
    dateAdded: "2026-03-20",
  },
  {
    name: "Hash Generator",
    description:
      "Generate SHA-1, SHA-256, SHA-384, and SHA-512 hashes from text.",
    href: "/tools/hash-generator",
    icon: RiShieldKeyholeLine,
    tags: ["security", "generation", "encoding"],
    dateAdded: "2026-02-25",
  },
  {
    name: "Regex Tester",
    description:
      "Test regular expressions with live match highlighting and capture groups.",
    href: "/tools/regex-tester",
    icon: RiFindReplaceLine,
    tags: ["text", "dev-utils"],
    dateAdded: "2026-02-25",
  },
  {
    name: "Diff Viewer",
    description:
      "Compare two blocks of text and see additions and deletions highlighted.",
    href: "/tools/diff-viewer",
    icon: RiGitMergeLine,
    tags: ["text", "dev-utils"],
    dateAdded: "2026-02-25",
  },
  {
    name: "CSS Unit Converter",
    description:
      "Convert between px, rem, em, vh, and vw with configurable base values.",
    href: "/tools/css-unit-converter",
    icon: RiRulerLine,
    tags: ["conversion", "dev-utils", "formatting"],
    dateAdded: "2026-02-25",
  },
  {
    name: "Hidden Character Revealer",
    description:
      "Spot invisible and non-printing characters hiding in your text.",
    href: "/tools/hidden-characters",
    icon: RiEyeLine,
    tags: ["text", "encoding"],
    dateAdded: "2026-02-25",
  },
  {
    name: "Markdown Preview",
    description: "Write Markdown and see a live rendered preview side by side.",
    href: "/tools/markdown-preview",
    icon: RiMarkdownLine,
    tags: ["text", "formatting"],
    dateAdded: "2026-02-25",
  },
  {
    name: "Image Compressor",
    description:
      "Batch compress images with side-by-side preview and ZIP download.",
    href: "/tools/image-compressor",
    icon: RiCollapseDiagonalLine,
    tags: ["image", "conversion"],
    dateAdded: "2026-02-25",
  },
  {
    name: "Cron Expression Explainer",
    description:
      "Decode cron expressions into plain English and preview upcoming run times.",
    href: "/tools/cron-explainer",
    icon: RiCalendarScheduleLine,
    tags: ["dev-utils", "date-time"],
    dateAdded: "2026-02-25",
  },
  {
    name: "CSV ↔ JSON Converter",
    description:
      "Convert CSV to JSON or JSON arrays to CSV with comma, tab, or semicolon delimiters.",
    href: "/tools/csv-json-converter",
    icon: RiTableLine,
    tags: ["data", "conversion", "formatting"],
    dateAdded: "2026-03-20",
  },
  {
    name: "YAML Formatter",
    description:
      "Format and validate YAML, convert YAML to JSON, or JSON to YAML — all in the browser.",
    href: "/tools/yaml-formatter",
    icon: RiFileTextLine,
    tags: ["data", "formatting", "conversion"],
    dateAdded: "2026-03-20",
  },
  {
    name: "SVG to PNG / JPEG Converter",
    description: "Convert SVG files to rasterised PNG or JPEG at any size.",
    href: "/tools/svg-converter",
    icon: RiFileImageLine,
    tags: ["image", "conversion"],
    dateAdded: "2026-02-25",
  },
  {
    name: "QR Code Generator",
    description:
      "Enter text or a URL to generate a QR code. Download as SVG or PNG.",
    href: "/tools/qr-code-generator",
    icon: RiQrCodeLine,
    tags: ["generation", "image", "seo"],
    dateAdded: "2026-02-25",
  },
  {
    name: "Tailwind Class Sorter",
    description:
      "Paste a className string and get it back sorted in the recommended Tailwind order.",
    href: "/tools/tailwind-sorter",
    icon: RiSortAsc,
    tags: ["formatting", "dev-utils"],
    dateAdded: "2026-02-25",
  },
  {
    name: "Placeholder Image Generator",
    description:
      "Pick dimensions, colours, and overlay text — get a downloadable placeholder PNG or a data URL.",
    href: "/tools/placeholder-image",
    icon: RiImageAddLine,
    tags: ["image", "generation", "colour"],
    dateAdded: "2026-02-25",
  },
  {
    name: "LinkedIn Banner Generator",
    description:
      "Create a custom LinkedIn profile banner with gradients, logos, and text. Designed to avoid the profile photo overlay.",
    href: "/tools/linkedin-banner",
    icon: RiImageAddLine,
    tags: ["image", "generation"],
    devOnly: true,
    dateAdded: "2026-03-06",
  },
  {
    name: "Date / Time Formatter",
    description:
      "Enter a date and see it formatted in ISO 8601, RFC 2822, SQL, relative, and more.",
    href: "/tools/date-formatter",
    icon: RiCalendarLine,
    tags: ["date-time", "formatting"],
    dateAdded: "2026-02-26",
  },
  {
    name: "Time Zone Converter",
    description:
      "Pick a date and time, then see it displayed across multiple time zones.",
    href: "/tools/timezone-converter",
    icon: RiEarthLine,
    tags: ["date-time", "conversion"],
    dateAdded: "2026-02-26",
  },
  {
    name: "Duration Calculator",
    description:
      "Calculate the duration between two dates, or add a duration to find an end date.",
    href: "/tools/duration-calculator",
    icon: RiHourglassLine,
    tags: ["date-time", "conversion"],
    dateAdded: "2026-02-26",
  },
  {
    name: "Relative Date Calculator",
    description:
      "Add or subtract days, weeks, months, or business days from any date.",
    href: "/tools/relative-date-calculator",
    icon: RiCalendarEventLine,
    tags: ["date-time", "conversion"],
    dateAdded: "2026-02-26",
  },
  {
    name: "Week Number Lookup",
    description:
      "Find the ISO week number for a date, or look up the date range for a given week.",
    href: "/tools/week-number",
    icon: RiCalendar2Line,
    tags: ["date-time", "conversion"],
    dateAdded: "2026-02-26",
  },
  {
    name: "Epoch Batch Converter",
    description:
      "Paste text containing Unix timestamps and see them converted to dates inline.",
    href: "/tools/epoch-batch-converter",
    icon: RiFileListLine,
    tags: ["date-time", "conversion", "text"],
    dateAdded: "2026-02-26",
  },
  {
    name: "Number Base Converter",
    description:
      "Convert between decimal, hexadecimal, octal, and binary. Supports large integers.",
    href: "/tools/number-base-converter",
    icon: RiHashtag,
    tags: ["conversion", "dev-utils"],
    dateAdded: "2026-02-26",
  },
  {
    name: "Byte / Bit Size Converter",
    description:
      "Convert between bytes, kilobytes, megabytes, and more — in both SI and binary units.",
    href: "/tools/byte-converter",
    icon: RiDatabase2Line,
    tags: ["conversion", "dev-utils", "data"],
    dateAdded: "2026-02-26",
  },
  {
    name: "Aspect Ratio Calculator",
    description:
      "Calculate aspect ratios from dimensions, or find a missing dimension from a ratio.",
    href: "/tools/aspect-ratio",
    icon: RiAspectRatioLine,
    tags: ["image", "conversion"],
    dateAdded: "2026-02-26",
  },
  {
    name: "Chmod Calculator",
    description:
      "Toggle permissions or enter a number to see the chmod breakdown.",
    href: "/tools/chmod-calculator",
    icon: RiLockLine,
    tags: ["dev-utils", "security"],
    dateAdded: "2026-02-26",
  },
  {
    name: "CIDR / Subnet Calculator",
    description:
      "Enter CIDR notation to see the network details, host range, and subnet mask.",
    href: "/tools/cidr-calculator",
    icon: RiRouterLine,
    tags: ["network", "dev-utils"],
    dateAdded: "2026-02-26",
  },
  {
    name: "Slug Generator",
    description: "Paste a title or sentence to generate a URL-friendly slug.",
    href: "/tools/slug-generator",
    icon: RiLinksLine,
    tags: ["text", "seo", "generation"],
    dateAdded: "2026-02-26",
  },
  {
    name: "Case Converter",
    description:
      "Convert text between camelCase, PascalCase, snake_case, kebab-case, and more.",
    href: "/tools/case-converter",
    icon: RiFontSize,
    tags: ["text", "conversion", "formatting"],
    dateAdded: "2026-02-26",
  },
  {
    name: "HTTP Status Code Reference",
    description:
      "A searchable reference of all HTTP status codes with descriptions and use cases.",
    href: "/tools/http-status-codes",
    icon: RiServerLine,
    tags: ["dev-utils", "network"],
    dateAdded: "2026-02-26",
  },
  {
    name: "Password Generator",
    description:
      "Generate secure random passwords with configurable length and character sets.",
    href: "/tools/password-generator",
    icon: RiLockPasswordLine,
    tags: ["security", "generation"],
    dateAdded: "2026-02-26",
  },
  {
    name: "Secret / Token Generator",
    description:
      "Generate cryptographically random secrets and tokens for API keys, JWT secrets, and more.",
    href: "/tools/secret-generator",
    icon: RiShieldKeyholeLine,
    tags: ["security", "generation", "dev-utils"],
    dateAdded: "2026-02-26",
  },
  {
    name: "Browser Info",
    description:
      "See everything your browser reveals — user agent, screen, GPU, network, and more.",
    href: "/tools/browser-info",
    icon: RiComputerLine,
    tags: ["dev-utils", "network"],
    dateAdded: "2026-03-06",
  },
  {
    name: "ASCII / Char Code Viewer",
    description:
      "Paste a string to see each character with its numeric code point underneath.",
    href: "/tools/ascii-char-codes",
    icon: RiHashtag,
    tags: ["text", "encoding", "dev-utils"],
    dateAdded: "2026-03-30",
  },
  {
    name: "Merge PDF",
    description:
      "Combine multiple PDF files into a single document — all in the browser.",
    href: "/tools/merge-pdf",
    icon: RiMergeCellsVertical,
    tags: ["pdf"],
    dateAdded: "2026-04-10",
  },
  {
    name: "Split PDF",
    description:
      "Split a PDF into individual pages or custom ranges. Download as a ZIP.",
    href: "/tools/split-pdf",
    icon: RiScissorsCutLine,
    tags: ["pdf"],
    dateAdded: "2026-04-10",
  },
  {
    name: "Rearrange PDF Pages",
    description:
      "Drag and drop to reorder pages in your PDF, then download the result.",
    href: "/tools/rearrange-pdf",
    icon: RiDragMove2Line,
    tags: ["pdf"],
    dateAdded: "2026-04-10",
  },
  {
    name: "Delete PDF Pages",
    description:
      "Select and remove unwanted pages from a PDF — all in the browser.",
    href: "/tools/delete-pdf-pages",
    icon: RiDeleteBin6Line,
    tags: ["pdf"],
    dateAdded: "2026-04-10",
  },
  {
    name: "Extract PDF Pages",
    description:
      "Pick specific pages from a PDF and download them as a new file.",
    href: "/tools/extract-pdf-pages",
    icon: RiFileReduceLine,
    tags: ["pdf"],
    dateAdded: "2026-04-10",
  },
  {
    name: "Rotate PDF",
    description:
      "Rotate individual pages or all pages in a PDF by 90°, 180°, or 270°.",
    href: "/tools/rotate-pdf",
    icon: RiRotateLockLine,
    tags: ["pdf"],
    dateAdded: "2026-04-10",
  },
  {
    name: "Resize PDF Pages",
    description:
      "Change the page size of your PDF to A4, Letter, or custom dimensions.",
    href: "/tools/resize-pdf",
    icon: RiFullscreenLine,
    tags: ["pdf"],
    dateAdded: "2026-04-10",
  },
  {
    name: "Compress PDF",
    description:
      "Reduce PDF file size by re-saving and stripping unused objects — all in the browser.",
    href: "/tools/compress-pdf",
    icon: RiCollapseDiagonalLine,
    tags: ["pdf"],
    dateAdded: "2026-04-10",
  },
  {
    name: "Flatten PDF",
    description:
      "Bake form fields and annotations into page content, making them permanent.",
    href: "/tools/flatten-pdf",
    icon: RiFileShieldLine,
    tags: ["pdf"],
    dateAdded: "2026-04-10",
  },
  {
    name: "PDF Metadata Editor",
    description:
      "View, edit, or strip metadata (title, author, keywords) from a PDF.",
    href: "/tools/pdf-metadata",
    icon: RiFileInfoLine,
    tags: ["pdf", "data"],
    dateAdded: "2026-04-10",
  },
  {
    name: "Perspective Mockup",
    description:
      "Place an image onto any surface with 3D perspective. Map a second image onto a four-point quad for realistic composites.",
    href: "/tools/perspective-mockup",
    icon: RiShape2Line,
    tags: ["image", "generation"],
    dateAdded: "2026-04-13",
  },
  {
    name: "Quick Logo Generator",
    description:
      "Type a few letters and get a clean branded logo for your project.",
    href: "/tools/logo-generator",
    icon: RiMagicLine,
    tags: ["image", "generation", "colour"],
    dateAdded: "2026-04-14",
  },
];

const isDevelopment = process.env.NODE_ENV === "development";

export const visibleTools = tools.filter(
  (tool) => !tool.devOnly || isDevelopment,
);

const RELATED_TOOLS_COUNT = 4;

export function getRelatedTools(href: string): Tool[] {
  const current = visibleTools.find((t) => t.href === href);
  if (!current) return [];

  const candidates = visibleTools.filter((t) => t.href !== href);

  const scored = candidates.map((tool) => {
    const overlap = tool.tags.filter((tag) =>
      current.tags.includes(tag),
    ).length;
    return { tool, overlap };
  });

  scored.sort((a, b) => {
    if (b.overlap !== a.overlap) return b.overlap - a.overlap;
    // Deterministic tie-break using slug characters
    const aKey = a.tool.href + href;
    const bKey = b.tool.href + href;
    return aKey < bKey ? -1 : 1;
  });

  return scored.slice(0, RELATED_TOOLS_COUNT).map((s) => s.tool);
}
