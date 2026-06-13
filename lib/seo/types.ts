/** Minimal Schema.org node used in JSON-LD payloads. */
export interface SchemaOrgNode {
  "@type": string;
  [key: string]: string | number | SchemaOrgNode | SchemaOrgNode[] | undefined;
}

export interface JsonLdDocument {
  "@context": "https://schema.org";
  "@graph"?: SchemaOrgNode[];
  "@type"?: string;
  [key: string]: string | SchemaOrgNode | SchemaOrgNode[] | undefined;
}
