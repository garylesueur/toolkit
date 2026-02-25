import type { RemixiconComponentType } from "@remixicon/react"
import {
  RiImageFill,
  RiGlobalLine,
  RiFingerprintLine,
  RiFileCodeLine,
  RiLink,
  RiCodeLine,
  RiTextBlock,
  RiTimeLine,
  RiCharacterRecognitionLine,
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
    name: "OG Preview",
    description: "Inspect Open Graph tags and preview how your link looks on social platforms.",
    href: "/tools/og-preview",
    icon: RiGlobalLine,
  },
]
