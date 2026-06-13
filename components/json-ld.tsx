import type { JsonLdDocument } from "@/lib/seo/types";

interface JsonLdProps {
  data: JsonLdDocument;
}

/** Renders a Schema.org JSON-LD script tag for search and AI crawlers. */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
