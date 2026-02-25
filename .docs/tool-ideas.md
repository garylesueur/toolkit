# Tool Ideas

A prioritised list of tool ideas for the Le Sueur Toolkit, sorted from simplest to most complex.

---

## Tier 1 — Trivial

Pure client-side, minimal UI. Each could be knocked out in minutes.

### 1. ID Generator

One-click generation of various ID formats: UUID (`crypto.randomUUID()`), short ID (alphanumeric), NanoID-style, CUID2, ULID, etc. Tap to generate, click to copy. The `lib/shared/id.ts` utilities already exist — this is mostly UI.

### 2. Base64 Encode / Decode

Paste text (or drop a file), get Base64 out — and vice versa. Two textareas with a direction toggle.

### 3. URL Encode / Decode

Paste a URL or query string, see it percent-encoded or decoded. Very similar layout to the Base64 tool.

### 4. HTML Entity Encode / Decode

Convert `<div>` to `&lt;div&gt;` and back. Handy when writing docs, emails, or CMS content.

### 5. Lorem Ipsum Generator

Pick a count of paragraphs, sentences, or words and copy the output. Simple and endlessly useful for mockups.

### 6. Unix Timestamp Converter

Convert between Unix timestamps (seconds and milliseconds) and human-readable dates in both directions. The `lib/shared/date.ts` formatters are already in place.

### 7. Character / Word Counter

Paste text and instantly see character count, word count, line count, and byte size. Useful for checking tweet lengths, meta description limits, commit messages, etc.

---

## Tier 2 — Simple

Still fully client-side, but with a bit more logic or UI surface.

### 8. JSON Formatter / Validator

Paste JSON, get it pretty-printed with syntax highlighting. Shows validation errors inline with line numbers.

### 9. JWT Decoder

Paste a JWT, see the decoded header and payload side by side (no secret verification — just decode). Highlights the expiry time and whether the token is expired.

### 10. Colour Converter

Enter a colour in any format (hex, RGB, HSL, Tailwind class name) and see all the other representations plus a live preview swatch.

### 11. Hash Generator

Paste text and get MD5, SHA-1, SHA-256, and SHA-512 hashes computed via the Web Crypto API. One-click copy for each.

### 12. Regex Tester

Enter a regular expression and a test string. See matches highlighted in real time with numbered capture groups listed below.

### 13. Diff Viewer

Paste two blocks of text and see a side-by-side or unified inline diff with additions and deletions highlighted.

### 14. CSS Unit Converter

Convert between px, rem, em, vh, and vw with a configurable base font size and viewport dimensions.

### 15. Hidden Character Revealer

Paste a string and see invisible / non-printing characters highlighted inline — zero-width spaces, non-breaking spaces, soft hyphens, control characters, RTL/LTR marks, etc. Each hidden character is shown as a labelled badge so you can spot exactly where they are. Useful for debugging copy-paste issues, mysterious string comparison failures, and sneaky Unicode.

---

## Tier 3 — Medium

More involved UI or logic, but still client-side.

### 16. SVG to PNG / JPEG Converter

Drop an SVG file, pick an output size, and download a rasterised PNG or JPEG. Uses a canvas element under the hood.

### 17. Image Compressor / Resizer

Drop an image, pick target quality and dimensions, and download the optimised version. Shows before/after file size.

### 18. Cron Expression Explainer

Enter a cron expression and see a plain-English explanation alongside the next N scheduled run times.

### 19. Markdown Preview

A live side-by-side Markdown editor and rendered preview. Could include a "copy as HTML" button.

### 20. QR Code Generator

Enter text or a URL, generate a QR code, and download it as SVG or PNG.

### 21. Tailwind Class Sorter

Paste a `className` string and get it back sorted in the official Tailwind recommended order.

### 22. Placeholder Image Generator

Pick dimensions, background colour, and overlay text — get a downloadable placeholder PNG or a data URL to paste straight into code.

---

## Tier 4 — Larger

May need an external library or a server-side component.

### 23. API Request Builder

A mini Postman — set HTTP method, URL, headers, and body, fire the request, and inspect the response with syntax-highlighted JSON.

### 24. SQL Formatter

Paste raw SQL and get it pretty-printed with keyword highlighting and consistent indentation.

### 25. TypeScript Playground

Paste TypeScript, see the compiled JavaScript output and any type errors. Would need a WASM-based TypeScript compiler.
