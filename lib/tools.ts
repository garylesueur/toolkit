import type { RemixiconComponentType } from "@remixicon/react"
import {
  RiCollapseDiagonalLine,
  RiImageFill,
  RiGlobalLine,
  RiFingerprintLine,
  RiFileCodeLine,
  RiLink,
  RiCodeLine,
  RiTextBlock,
  RiTimeLine,
  RiCharacterRecognitionLine,
  RiBracesLine,
  RiKey2Line,
  RiPaletteLine,
  RiShieldKeyholeLine,
  RiFindReplaceLine,
  RiGitMergeLine,
  RiRulerLine,
  RiEyeLine,
  RiPuzzleLine,
  RiMarkdownLine,
  RiCalendarScheduleLine,
  RiFileImageLine,
  RiQrCodeLine,
  RiSortAsc,
  RiImageAddLine,
} from "@remixicon/react"

export type Tool = {
  name: string
  description: string
  href: string
  icon: RemixiconComponentType
}

export const tools: Tool[] = [
  {
    name: "ID Generator",
    description: "Generate UUIDs, short IDs, NanoIDs, and ULIDs with one click.",
    href: "/tools/id-generator",
    icon: RiFingerprintLine,
  },
  {
    name: "Base64 Encode / Decode",
    description: "Encode text to Base64 or decode Base64 back to text.",
    href: "/tools/base64",
    icon: RiFileCodeLine,
  },
  {
    name: "URL Encode / Decode",
    description: "Percent-encode text for URLs or decode encoded strings.",
    href: "/tools/url-encode-decode",
    icon: RiLink,
  },
  {
    name: "HTML Entities",
    description: "Convert special characters to HTML entities and back.",
    href: "/tools/html-entities",
    icon: RiCodeLine,
  },
  {
    name: "Lorem Ipsum Generator",
    description: "Generate placeholder text in paragraphs, sentences, or words.",
    href: "/tools/lorem-ipsum",
    icon: RiTextBlock,
  },
  {
    name: "Unix Timestamp Converter",
    description: "Convert between Unix timestamps and human-readable dates.",
    href: "/tools/unix-timestamp",
    icon: RiTimeLine,
  },
  {
    name: "Character & Word Counter",
    description: "Count characters, words, sentences, lines, and bytes in your text.",
    href: "/tools/character-counter",
    icon: RiCharacterRecognitionLine,
  },
  {
    name: "Favicon Generator",
    description: "Upload a square PNG and get every favicon size your site needs.",
    href: "/tools/favicon-generator",
    icon: RiImageFill,
  },
  {
    name: "Chrome Extension Icons",
    description: "Upload a PNG and get every icon size a Chrome extension needs.",
    href: "/tools/chrome-extension-icons",
    icon: RiPuzzleLine,
  },
  {
    name: "OG Preview",
    description: "Inspect Open Graph tags and preview how your link looks on social platforms.",
    href: "/tools/og-preview",
    icon: RiGlobalLine,
  },
  {
    name: "JSON Formatter",
    description: "Pretty-print and validate JSON with clear error messages.",
    href: "/tools/json-formatter",
    icon: RiBracesLine,
  },
  {
    name: "JWT Decoder",
    description: "Decode JWT headers and payloads — no secret needed.",
    href: "/tools/jwt-decoder",
    icon: RiKey2Line,
  },
  {
    name: "Colour Converter",
    description: "Convert colours between hex, RGB, and HSL with a live preview.",
    href: "/tools/colour-converter",
    icon: RiPaletteLine,
  },
  {
    name: "Hash Generator",
    description: "Generate SHA-1, SHA-256, SHA-384, and SHA-512 hashes from text.",
    href: "/tools/hash-generator",
    icon: RiShieldKeyholeLine,
  },
  {
    name: "Regex Tester",
    description: "Test regular expressions with live match highlighting and capture groups.",
    href: "/tools/regex-tester",
    icon: RiFindReplaceLine,
  },
  {
    name: "Diff Viewer",
    description: "Compare two blocks of text and see additions and deletions highlighted.",
    href: "/tools/diff-viewer",
    icon: RiGitMergeLine,
  },
  {
    name: "CSS Unit Converter",
    description: "Convert between px, rem, em, vh, and vw with configurable base values.",
    href: "/tools/css-unit-converter",
    icon: RiRulerLine,
  },
  {
    name: "Hidden Character Revealer",
    description: "Spot invisible and non-printing characters hiding in your text.",
    href: "/tools/hidden-characters",
    icon: RiEyeLine,
  },
  {
    name: "Markdown Preview",
    description: "Write Markdown and see a live rendered preview side by side.",
    href: "/tools/markdown-preview",
    icon: RiMarkdownLine,
  },
  {
    name: "Image Compressor / Resizer",
    description: "Compress and resize images with adjustable quality and format.",
    href: "/tools/image-compressor",
    icon: RiCollapseDiagonalLine,
  },
  {
    name: "Cron Expression Explainer",
    description: "Decode cron expressions into plain English and preview upcoming run times.",
    href: "/tools/cron-explainer",
    icon: RiCalendarScheduleLine,
  },
  {
    name: "SVG to PNG / JPEG Converter",
    description: "Convert SVG files to rasterised PNG or JPEG at any size.",
    href: "/tools/svg-converter",
    icon: RiFileImageLine,
  },
  {
    name: "QR Code Generator",
    description: "Enter text or a URL to generate a QR code. Download as SVG or PNG.",
    href: "/tools/qr-code-generator",
    icon: RiQrCodeLine,
  },
  {
    name: "Tailwind Class Sorter",
    description: "Paste a className string and get it back sorted in the recommended Tailwind order.",
    href: "/tools/tailwind-sorter",
    icon: RiSortAsc,
  },
  {
    name: "Placeholder Image Generator",
    description: "Pick dimensions, colours, and overlay text — get a downloadable placeholder PNG or a data URL.",
    href: "/tools/placeholder-image",
    icon: RiImageAddLine,
  },
]
