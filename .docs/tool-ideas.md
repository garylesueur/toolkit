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

## Tier 4 — Date & Time

Client-side date and time utilities. Builds on the existing Unix Timestamp Converter.

### 23. Date / Time Formatter

Enter a date (or use "now") and see it formatted in dozens of common patterns: ISO 8601, RFC 2822, relative ("3 days ago"), locale-specific formats, SQL datetime, and format strings for Go, Python, and JavaScript. Pick a format, click to copy.

### 24. Time Zone Converter

Pick a date and time, then see it displayed across multiple time zones simultaneously. Add and remove zones from a saved list. Great for coordinating across distributed teams or debugging server logs in UTC vs local time.

### 25. Duration Calculator

Enter two dates (or a date and "now") and see the duration between them in every useful unit: years/months/days, total days, total hours, total minutes, total seconds, total milliseconds. Also works in reverse — enter a duration and a start date, get the end date.

### 26. Relative Date Calculator

"What date is 90 business days from today?" or "45 days before 2026-03-15?" Enter a base date and an offset (days, weeks, months, or business days) and get the result. Handy for deadline calculations, sprint planning, and contract terms.

### 27. Week Number Lookup

Enter a date, get the ISO week number. Or enter a week number and year, get the date range for that week. Useful in European business contexts and anywhere ISO weeks come up.

### 28. Epoch Batch Converter

Paste a block of text containing timestamps (log files, database dumps, JSON payloads) and get every timestamp converted to a human-readable date inline, preserving the surrounding text. Like the Unix Timestamp Converter but for bulk / embedded timestamps.

---

## Tier 5 — More Developer Utilities

Miscellaneous client-side tools developers reach for regularly.

### 29. Number Base Converter

Convert between decimal, hexadecimal, octal, and binary. Enter a number in any base, see all the others instantly. Supports large integers. Useful for bitwise operations, colour values, file permissions, and memory addresses.

### 30. Byte / Bit Size Converter

Enter a value like "1.5 GB" and see it in bytes, KB, MB, GB, and TB — in both SI (1000-based) and binary (1024-based) units. Useful for storage calculations, bandwidth estimates, and file size limits.

### 31. Aspect Ratio Calculator

Enter a width and height, get the simplified aspect ratio. Or enter an aspect ratio and one dimension, get the other. Useful for responsive design, video encoding, and image cropping.

### 32. Chmod Calculator

Toggle read/write/execute for owner/group/other and see the numeric (e.g. `755`) and symbolic (e.g. `rwxr-xr-x`) representations. Or enter a number and see the permission breakdown.

### 33. CIDR / Subnet Calculator

Enter a CIDR notation (e.g. `192.168.1.0/24`) and see the network address, broadcast address, usable host range, total hosts, wildcard mask, and subnet mask.

### 34. Slug Generator

Paste a title or sentence, get a URL-friendly slug. Options for separator (hyphen vs underscore), max length, and transliteration of accented characters.

### 35. Case Converter

Paste text and convert between camelCase, PascalCase, snake_case, kebab-case, SCREAMING_SNAKE_CASE, Title Case, and Sentence case. Developers switch between naming conventions constantly.

### 36. HTTP Status Code Reference

A searchable, categorised reference of all HTTP status codes with descriptions, common use cases, and which ones are cacheable or retryable. A quick-reference card rather than a converter.
