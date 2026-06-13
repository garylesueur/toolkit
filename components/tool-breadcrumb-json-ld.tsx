import { JsonLd } from "@/components/json-ld";
import { createToolBreadcrumbJsonLd } from "@/lib/seo/breadcrumb-json-ld";

interface ToolBreadcrumbJsonLdProps {
  slug: string;
}

/** Injects `BreadcrumbList` JSON-LD for the current tool page. */
export function ToolBreadcrumbJsonLd({ slug }: ToolBreadcrumbJsonLdProps) {
  const data = createToolBreadcrumbJsonLd(slug);
  if (!data) {
    return null;
  }

  return <JsonLd data={data} />;
}
