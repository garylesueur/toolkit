import { canonicalPath } from "@/lib/site";

import type { JsonLdDocument } from "./types";

export interface FaqItem {
  question: string;
  answer: string;
}

/** Visible FAQ copy for the home page — keep in sync with `createHomeFaqJsonLd`. */
export const HOME_FAQ_ITEMS: FaqItem[] = [
  {
    question: "What is Toolkit?",
    answer:
      "Toolkit is a collection of browser-based developer utilities — JSON formatters, PDF tools, encoders, and more — built by Gary Le Sueur.",
  },
  {
    question: "Do I need an account or sign up?",
    answer:
      "No. There are no accounts, sign-ups, or paywalls for the browser tools.",
  },
  {
    question: "Is my data sent to a server?",
    answer:
      "Most tools process files and pasted input locally in your browser. Each tool states its processing boundary. Open Graph Preview and Domain Inspector make disclosed third-party lookups; My IP uses server and external address checks, and Logo Generator loads Google Fonts. Markdown previews block remote images. The separate authenticated MCP integration processes Markdown on the server and stores generated PDFs in Vercel Blob. Page-view analytics are separate from tool processing and do not receive your tool input.",
  },
  {
    question: "How do I find a specific tool?",
    answer:
      "Use the search box on the home page or browse the tool grid. You can also link directly to any tool at toolkit.lesueur.uk/tools/<slug>.",
  },
  {
    question: "Who built Toolkit and how do I get in touch?",
    answer:
      "Toolkit is built and maintained by Gary Le Sueur. For feedback or questions, email toolkit@lesueur.uk.",
  },
];

/** `FAQPage` schema matching the visible home page FAQ section. */
export function createHomeFaqJsonLd(): JsonLdDocument {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": HOME_FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer,
      },
    })),
    "url": canonicalPath("/"),
  };
}
