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
      "No. Every tool runs entirely in your browser. There are no accounts, sign-ups, or paywalls.",
  },
  {
    question: "Is my data sent to a server?",
    answer:
      "No. Processing happens locally in your browser. Your files and input are not uploaded unless a tool explicitly fetches a URL you provide (for example, the Open Graph preview tool).",
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
