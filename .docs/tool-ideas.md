# Tool ideas and inventory

The canonical list of registered tools (names, routes, descriptions, `devOnly` flags) lives in [`lib/tools.ts`](../lib/tools.ts). Production navigation uses `visibleTools`, which hides entries where `devOnly: true` unless `NODE_ENV === "development"`.

This document tracks **what is shipped**, **what is hidden or broken**, and **backlog ideas** for future work.

---

## Shipped (production)

These tools are registered and appear on the home grid for normal builds (45 entries).

| Tool | Route |
|------|--------|
| ID Generator | `/tools/id-generator` |
| Base64 Encode / Decode | `/tools/base64` |
| URL Encode / Decode | `/tools/url-encode-decode` |
| HTML Entities | `/tools/html-entities` |
| Lorem Ipsum Generator | `/tools/lorem-ipsum` |
| Unix Timestamp Converter | `/tools/unix-timestamp` |
| Character & Word Counter | `/tools/character-counter` |
| Favicon Generator | `/tools/favicon-generator` |
| Chrome Extension Icons | `/tools/chrome-extension-icons` |
| OG Preview | `/tools/og-preview` |
| JSON Formatter | `/tools/json-formatter` |
| JWT Decoder | `/tools/jwt-decoder` |
| Colour Converter | `/tools/colour-converter` |
| WCAG Contrast Checker | `/tools/contrast-checker` |
| Hash Generator | `/tools/hash-generator` |
| Regex Tester | `/tools/regex-tester` |
| Diff Viewer | `/tools/diff-viewer` |
| CSS Unit Converter | `/tools/css-unit-converter` |
| Hidden Character Revealer | `/tools/hidden-characters` |
| Markdown Preview | `/tools/markdown-preview` |
| Image Compressor / Resizer | `/tools/image-compressor` |
| Cron Expression Explainer | `/tools/cron-explainer` |
| CSV ↔ JSON Converter | `/tools/csv-json-converter` |
| YAML Formatter | `/tools/yaml-formatter` |
| SVG to PNG / JPEG Converter | `/tools/svg-converter` |
| QR Code Generator | `/tools/qr-code-generator` |
| Tailwind Class Sorter | `/tools/tailwind-sorter` |
| Placeholder Image Generator | `/tools/placeholder-image` |
| Date / Time Formatter | `/tools/date-formatter` |
| Time Zone Converter | `/tools/timezone-converter` |
| Duration Calculator | `/tools/duration-calculator` |
| Relative Date Calculator | `/tools/relative-date-calculator` |
| Week Number Lookup | `/tools/week-number` |
| Epoch Batch Converter | `/tools/epoch-batch-converter` |
| Number Base Converter | `/tools/number-base-converter` |
| Byte / Bit Size Converter | `/tools/byte-converter` |
| Aspect Ratio Calculator | `/tools/aspect-ratio` |
| Chmod Calculator | `/tools/chmod-calculator` |
| CIDR / Subnet Calculator | `/tools/cidr-calculator` |
| Slug Generator | `/tools/slug-generator` |
| Case Converter | `/tools/case-converter` |
| HTTP Status Code Reference | `/tools/http-status-codes` |
| Password Generator | `/tools/password-generator` |
| Secret / Token Generator | `/tools/secret-generator` |
| Browser Info | `/tools/browser-info` |

**Implementation notes (for doc accuracy):**

- **Hash Generator** — SHA-1, SHA-256, SHA-384, and SHA-512 via Web Crypto (not MD5).
- **ID Generator** — See in-app options; registry text summarises supported ID styles.

---

## Dev-only / needs work

| Tool | Route | Status |
|------|--------|--------|
| LinkedIn Banner Generator | `/tools/linkedin-banner` | Registered with `devOnly: true`. **Does not work reliably at the moment** (export / canvas / layout issues — treat as WIP). Keep hidden from production until fixed; then remove `devOnly` and verify metadata and sitemap. |

---

## Backlog (not built)

Prioritised roughly from simpler client-side utilities toward heavier scope.

### High fit (client-side, common use)

- **SemVer calculator** — Parse, compare, bump major/minor/patch.
- **Line ending normaliser** — CRLF ↔ LF; complements Hidden Character Revealer.
- **Sort / dedupe lines** — Alphabetical sort, unique lines only.
- **MIME type / file extension reference** — Lookup tables both directions.

### Medium scope

- **`.env` parser / normaliser** — Validate shape, highlight duplicates; no secret storage.
- **TOML formatter** — Same class as YAML for config-heavy stacks.
- **IP address tools** — Validate IPv4/IPv6, expand compressed IPv6 (complements CIDR calculator).
- **JSON-LD / structured data formatter** — Paste-only pretty-print and validation.
- **HMAC calculator** — Key + message → HMAC-SHA256/384/512 (with clear warnings about secrets).

### Larger or needs careful scoping

- **X.509 / PEM certificate viewer** — Decode PEM client-side where feasible.
- **cURL → fetch / code snippets** — Popular but many edge cases.
- **Raw HTTP / REST client** — Often wants request history or server proxy; higher effort.

---

## Adding a new tool

1. Implement the page under `app/tools/<slug>/`.
2. Register in [`lib/tools.ts`](../lib/tools.ts) (and use `devOnly` until ready for public listing).
3. Follow project rules: metadata in [`lib/tools-metadata.ts`](../lib/tools-metadata.ts) patterns, [`app/sitemap.ts`](../app/sitemap.ts) if driven from the registry, [`app/robots.ts`](../app/robots.ts) if relevant.
4. Update this doc: move the idea from **Backlog** to **Shipped** (or **Dev-only**) when it exists.
