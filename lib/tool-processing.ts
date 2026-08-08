export type ProcessingKind =
  | "local"
  | "direct-third-party"
  | "first-party-server";

export type ToolProcessing = {
  kind: ProcessingKind;
  label: string;
  summary: string;
  recipients: readonly string[];
};

const LOCAL_TOOL_HREFS = [
  "/tools/id-generator",
  "/tools/base64",
  "/tools/url-encode-decode",
  "/tools/html-entities",
  "/tools/lorem-ipsum",
  "/tools/unix-timestamp",
  "/tools/character-counter",
  "/tools/favicon-generator",
  "/tools/chrome-extension-icons",
  "/tools/json-formatter",
  "/tools/jwt-decoder",
  "/tools/colour-converter",
  "/tools/contrast-checker",
  "/tools/hash-generator",
  "/tools/password-strength",
  "/tools/url-inspector",
  "/tools/image-metadata-scrubber",
  "/tools/browser-privacy",
  "/tools/csp-builder",
  "/tools/certificate-decoder",
  "/tools/barcode-reader",
  "/tools/sql-formatter",
  "/tools/xml-tools",
  "/tools/json-to-typescript",
  "/tools/query-string-builder",
  "/tools/text-line-tools",
  "/tools/css-builders",
  "/tools/regex-tester",
  "/tools/diff-viewer",
  "/tools/css-unit-converter",
  "/tools/hidden-characters",
  "/tools/markdown-preview",
  "/tools/image-compressor",
  "/tools/cron-explainer",
  "/tools/cron-builder",
  "/tools/barcode-generator",
  "/tools/web-code-formatter",
  "/tools/image-editor",
  "/tools/impose-pdf",
  "/tools/pdf-validator",
  "/tools/protect-pdf",
  "/tools/redact-pdf",
  "/tools/pdf-accessibility",
  "/tools/ocr-pdf",
  "/tools/extract-pdf-images",
  "/tools/extract-pdf-fonts",
  "/tools/csv-json-converter",
  "/tools/yaml-formatter",
  "/tools/svg-converter",
  "/tools/qr-code-generator",
  "/tools/tailwind-sorter",
  "/tools/placeholder-image",
  "/tools/linkedin-banner",
  "/tools/date-formatter",
  "/tools/timezone-converter",
  "/tools/duration-calculator",
  "/tools/relative-date-calculator",
  "/tools/week-number",
  "/tools/epoch-batch-converter",
  "/tools/number-base-converter",
  "/tools/byte-converter",
  "/tools/aspect-ratio",
  "/tools/chmod-calculator",
  "/tools/cidr-calculator",
  "/tools/slug-generator",
  "/tools/case-converter",
  "/tools/http-status-codes",
  "/tools/password-generator",
  "/tools/secret-generator",
  "/tools/browser-info",
  "/tools/ascii-char-codes",
  "/tools/merge-pdf",
  "/tools/split-pdf",
  "/tools/rearrange-pdf",
  "/tools/delete-pdf-pages",
  "/tools/extract-pdf-pages",
  "/tools/rotate-pdf",
  "/tools/resize-pdf",
  "/tools/compress-pdf",
  "/tools/images-to-pdf",
  "/tools/pdf-to-images",
  "/tools/add-page-numbers",
  "/tools/watermark-pdf",
  "/tools/crop-pdf",
  "/tools/scan-to-pdf",
  "/tools/pdf-form-filler",
  "/tools/sign-pdf",
  "/tools/pdf-attachments",
  "/tools/remove-pdf-annotations",
  "/tools/pdf-bookmarks",
  "/tools/pdf-active-content",
  "/tools/compare-pdfs",
  "/tools/flatten-pdf",
  "/tools/pdf-metadata",
  "/tools/perspective-mockup",
  "/tools/pdf-to-markdown",
  "/tools/markdown-to-pdf",
] as const;

const LOCAL_PROCESSING: ToolProcessing = {
  kind: "local",
  label: "Browser only",
  summary:
    "Tool input is processed in this browser and is not sent to a processing service.",
  recipients: [],
};

const NETWORK_TOOL_PROCESSING: Readonly<Record<string, ToolProcessing>> = {
  "/tools/og-preview": {
    kind: "direct-third-party",
    label: "Third-party lookup",
    summary:
      "Your browser requests the URL you enter and may load its preview images. The destination site and referenced image hosts receive those requests; this site's server does not proxy them.",
    recipients: ["the entered website", "referenced preview image hosts"],
  },
  "/tools/logo-generator": {
    kind: "direct-third-party",
    label: "Third-party font",
    summary:
      "Your browser loads the selected typeface from Google Fonts. Your logo text and exported image stay in the browser.",
    recipients: ["Google Fonts"],
  },
  "/tools/domain-inspector": {
    kind: "direct-third-party",
    label: "Third-party lookup",
    summary:
      "Your browser sends the domain, IP address, or AS number to IANA, the selected authoritative RDAP registry, and—for domain DNS records—Cloudflare's DNS resolver. This site's server is not used.",
    recipients: ["IANA", "the authoritative RDAP registry", "Cloudflare DNS"],
  },
  "/tools/my-ip": {
    kind: "first-party-server",
    label: "Server lookup",
    summary:
      "This tool asks this site's server which public address reached it. Its separate IPv4 and IPv6 probes also contact ipify directly from your browser.",
    recipients: ["this site's IP endpoint", "ipify"],
  },
};

export const TOOL_PROCESSING: Readonly<Record<string, ToolProcessing>> =
  Object.freeze({
    ...Object.fromEntries(
      LOCAL_TOOL_HREFS.map((href) => [href, LOCAL_PROCESSING]),
    ),
    ...NETWORK_TOOL_PROCESSING,
  });

export function getToolProcessing(href: string): ToolProcessing {
  const processing = TOOL_PROCESSING[href];
  if (!processing) {
    throw new Error(`Tool processing boundary is not classified: ${href}`);
  }
  return processing;
}
