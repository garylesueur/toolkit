# Product roadmap

Last reviewed: 7 August 2026

## Product rules

The toolkit should be useful before it is clever.

- Process user files and pasted data locally in the browser by default.
- Prefer deterministic browser APIs and permissively licensed libraries over paid APIs.
- Only adopt dependencies with permissive licences that are compatible with keeping this application proprietary, such as MIT, BSD, ISC, or Apache-2.0. Reject AGPL, GPL, and other copyleft dependencies unless the project owner explicitly changes this policy after legal review.
- A tool that contacts a third party must say who is contacted, what is sent, and why before the request is made.
- Do not market a visual overlay as redaction, a PDF re-save as strong compression, or a generated scribble as a cryptographic signature.
- Do not add AI where a parser, codec, formula, or established algorithm produces a more reliable answer.
- Large WebAssembly modules and on-device models must be lazy-loaded and run in a worker, with cancel and progress controls.
- Every file tool should be usable without an account, upload, or server-side processing bill.

## Immediate: repair trust and quality

### P0 — Make PDF compression honest and effective

The current compressor loads the PDF with `pdf-lib` and saves it again. This may remove unused objects from repeatedly edited files, but it does not recompress the images that dominate scans and image-heavy PDFs.

Status: the lossless optimiser is implemented locally with the official `pdfcpu` 0.14.0 WebAssembly build. Strong lossy compression remains a separate future mode.

Deliver two clearly named modes rather than one misleading button:

1. **Lossless optimise** — preserve text, links, forms, vectors, and accessibility while removing redundant objects and resources. The implementation uses the official Apache-2.0 `pdfcpu` JavaScript/WASM build, whose optimiser removes redundant fonts, images, content streams, and page resources.
2. **Strong compression** — render and rebuild pages with selectable DPI and JPEG quality presets. This can use the PDF.js, Canvas, and `pdf-lib` dependencies already shipped. It must warn that pages are flattened and selectable text, links, forms, signatures, layers, and accessibility structure are lost.

Before changing the default, create a small public test corpus covering scans, exported office documents, forms, vector-heavy documents, transparency, rotated pages, and already-optimised PDFs. Record output size, render similarity, retained features, peak memory, and processing time. Never download an output larger than the input unless the user explicitly chooses it.

Do not use Ghostscript or a Ghostscript WASM wrapper. Ghostscript is AGPL or commercially licensed, and this project does not accept AGPL dependencies. A browser/WASM build changes where the code runs, not the licence attached to it.

### P0 — Audit privacy claims

- Inventory every tool as `local`, `direct third-party lookup`, or `first-party server`.
- Keep the local-processing banner for genuinely local tools.
- Give network tools a different disclosure. The IP endpoint, RDAP, DNS-over-HTTPS, OG lookup, analytics, and the Markdown-to-PDF MCP flow must not be described as zero-network tools.
- Add an automated regression check that file-processing pages do not `fetch`, upload, or submit user files.

## Next: high-value browser-only tools

These fill obvious gaps in the current 63-tool catalogue with little or no infrastructure cost.

### P1 — Complete the practical PDF set

Status: **Images to PDF and PDF to Images are implemented locally.** The conversion pair supports ordering and layout on the way in, plus selected-page PNG/JPEG export with resolution, quality, progress, cancellation, and ZIP download on the way out.

1. **Images to PDF** — reorder JPG, PNG, and WebP files; choose page size, margins, orientation, and fit mode.
2. **PDF to images** — export selected pages to PNG or JPEG with scale/quality controls and ZIP download.
3. **Watermark PDF** — text or image, opacity, rotation, position, page range, foreground/background.
4. **Add page numbers** — format, start number, position, margins, and page range.
5. **Crop PDF** — visual crop box editor with apply-to-page-range support; preserve content rather than rasterising it.
6. **Scan to PDF** — camera/file input, rotate, crop, grayscale, contrast, page ordering, and local PDF export.
7. **PDF form filler** — detect AcroForm fields, fill locally, and optionally flatten only after an explicit choice.
8. **Sign PDF** — draw, type, or upload a signature image. Label this as placing a signature, not certificate-backed digital signing.
9. **PDF attachments and images** — list, extract, and remove embedded files; extract embedded images where the library can do so safely.
10. **Compare PDFs** — page-aligned visual difference with an overlay/slider and a downloadable report. Keep the original files local.

### P1 — Privacy and safety tools

1. **File checksum verifier** — extend Hash Generator to accept files, stream them where possible, compare against a supplied digest, and clearly distinguish checksums from malware scanning.
2. **Image metadata viewer and scrubber** — show EXIF/GPS/device fields, then remove them by local re-encoding. Warn about quality/colour-profile changes.
3. **Password strength checker** — local strength and pattern analysis; never transmit the password. Keep it separate from the password generator.
4. **Suspicious URL inspector** — parse scheme, host, port, credentials, redirects encoded in query strings, punycode, mixed scripts, and common lookalike tricks. Do not claim to detect malware without a reputation service.
5. **Browser privacy check** — turn the most actionable parts of Browser Info into a plain-English checklist for cookies, Global Privacy Control, Do Not Track, permissions, storage, and fingerprinting surface. Report only what browsers actually expose.
6. **PEM / certificate decoder** — inspect locally pasted X.509 certificates, dates, names, key usage, fingerprints, and chains without contacting a host.
7. **CSP builder and analyser** — construct a Content-Security-Policy, flag unsafe directives, and explain trade-offs locally.
8. **QR and barcode reader** — decode from camera or image locally and show the decoded destination safely before opening it.

### P1 — Small tools with strong repeat use

- SQL formatter and minifier
- XML formatter, validator, and XML ↔ JSON converter
- JSON ↔ YAML converter and JSON-to-TypeScript generator
- URL/query-string parser and builder
- HTML/CSS/JavaScript formatter and minifier
- Text sort, deduplicate, shuffle, and line-number tools
- Image resize/crop/format converter, including WebP and AVIF where browser support permits
- CSS gradient and box-shadow builders
- Barcode generator
- Cron expression builder, complementing the existing explainer

## Later: useful but heavier or riskier

### P2 — PDF capabilities needing a technical spike

- **True secure redaction** — annotations or black rectangles are not sufficient. Removal must be verified against extracted text, hidden layers, annotations, attachments, and incremental revisions. A flatten-and-rebuild option may be acceptable if the data-loss trade-off is explicit.
- **Protect/unlock PDF** — only with a maintained implementation of standard PDF encryption and test vectors. Do not invent cryptography.
- **PDF validation and repair** — a good candidate for the official `pdfcpu` WASM build, subject to browser memory and malformed-file testing.
- **Booklet / N-up imposition** — useful, deterministic, and supported by mature PDF engines, but less urgent than conversion and marking tools.
- **Local OCR** — Tesseract-style OCR can run in a worker with downloadable language packs. It is useful non-generative ML, but the download size, mobile performance, accuracy, and searchable-PDF construction need a spike.
- **PDF/A and accessibility checks** — valuable, but only if conformance can be tested. Avoid a checkbox that merely changes metadata.

### P2 — Network tools with no paid API

These may have no direct usage bill, but they are not private/local tools and public services can rate-limit or change terms.

- DNS record explorer and propagation comparison
- HTTP header and redirect inspector
- TLS certificate checker for a live hostname
- Security header checker
- Pwned-password range lookup using k-anonymity, with an explicit disclosure before the request

Use public endpoints only after checking terms, CORS support, reliability, and abuse limits. Build graceful failure and provider attribution in from the start.

## Do not build yet

- Generic AI chat, prompt improver, summariser, rewriter, or “humaniser”. Users who want these already have better AI products, and hosted inference creates variable cost and privacy questions.
- PDF-to-Word/Excel/PowerPoint presented as faithful conversion. Layout reconstruction is hard, and weak output damages trust.
- Malware or phishing “scanner” without a maintained threat-intelligence source. A heuristic URL explainer is fine; a safety verdict is not.
- DNS leak or WebRTC leak tests advertised as fully local. Meaningful tests require external observation infrastructure.
- Certificate-backed digital signatures, multi-party e-signature workflows, or legal-validity claims without identity, key custody, timestamping, audit, and compliance infrastructure.
- Hidden upload fallbacks for large files or unsupported browsers.

## Suggested delivery order

1. Compression test corpus and honest two-mode compressor decision.
2. Privacy/network classification and wording audit.
3. Images to PDF, PDF to images, watermark, and page numbers.
4. File checksum support and image metadata scrubber.
5. Crop, scan to PDF, form fill, and placed signatures.
6. Suspicious URL inspector, browser privacy check, certificate decoder, and CSP builder.
7. Evaluate `pdfcpu` WASM for optimisation, attachments, validation, repair, encryption, and imposition.
8. Run the OCR spike only after the core PDF suite is dependable.

## Research notes

- [PDF24's catalogue](https://tools.pdf24.org/en/all-tools) is a useful breadth checklist: watermarking, page numbers, image conversion, comparison, redaction, OCR, web optimisation, and archival formats are conspicuous gaps here.
- [Smallpdf's catalogue](https://smallpdf.com/pdf-tools) confirms compression, OCR, redaction, signing, and conversion as the expected mainstream PDF set, but not all are suitable for a zero-server product.
- [CyberChef](https://github.com/gchq/CyberChef) demonstrates how far deterministic encryption, encoding, compression, parsing, and data analysis can go entirely client-side.
- [`pdfcpu` usage](https://pdfcpu.io/getting_started/usage/) covers optimisation, validation, encryption, attachments, forms, watermarks, imposition, images, and page operations. Its official releases now include a JavaScript/WASM build.
- [`qpdf`](https://github.com/qpdf/qpdf) is Apache-2.0 and strong at content-preserving structural transforms, but its own documentation says size optimisation is not its primary purpose.
- [Ghostscript's licensing FAQ](https://ghostscript.com/faq/index.html) requires AGPL compliance or a commercial licence when distributing it as part of an application, so Ghostscript is excluded from this project.
- [Web Crypto](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) is broadly available for local cryptographic primitives, but its low-level nature makes design and key handling easy to get wrong.
