# Processing and network inventory

Last reviewed: 30 September 2026

The catalogue has an explicit processing classification in `lib/tool-processing.ts`. A test requires every tool route to appear exactly once, so adding a tool without deciding its boundary fails the test suite.

## Browser-only tools

All tools classified as **Browser only** process tool input locally. A few download their own same-origin static runtime assets—fonts, PDF WebAssembly, OCR WebAssembly, or OCR language data—but those requests do not contain the user's file or pasted content.

Browser-only processing does not mean the whole website makes zero requests. Vercel Analytics is loaded globally for ordinary page-view analytics. It is not part of tool processing and must never receive file contents or pasted tool input.

Markdown Preview and Markdown to PDF previews remove automatic remote-image and raw-HTML resource loading. Safe embedded raster images may display; ordinary links require explicit navigation. PDF generation embeds supported inline data images and skips remote images. Pasted URL query strings stay local unless the user follows a link.

## Direct third-party lookups

| Tool                 | Recipients                                                | Data sent                                                                                     |
| -------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Open Graph Preview   | Entered website and referenced preview-image hosts        | The URL request, normal browser request metadata, and subsequent preview-image requests       |
| Quick Logo Generator | Google Fonts                                              | The selected font-family stylesheet and font-file requests; logo text and output are not sent |
| Domain Inspector     | IANA, the authoritative RDAP registry, and Cloudflare DNS | The domain, IP address, or AS number being looked up                                          |

These calls go directly from the browser. They do not pass through this site's application server.

## First-party server processing

| Tool                   | Recipients                                                       | Data sent                                                    |
| ---------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------ |
| What Is My IP Address? | This site's `/api/ip` endpoint and direct ipify IPv4/IPv6 probes | Normal request metadata needed to observe the public address |

The browser version of Markdown to PDF is local. Separately, the authenticated `/api/mcp` integration receives Markdown from an external MCP client for server conversion. Generated PDFs are stored in Vercel Blob and returned by download URL; an authenticated cleanup route removes expired output. That integration is not used by the browser tool page. See README.md for credentials and retention settings.

## Regression guard

`tests/tool-processing.test.mts` inventories every raw `fetch` source and every approved same-origin static-asset fetch. A new fetch, upload body, beacon, WebSocket, EventSource, or mutation request fails until its owner and processing boundary are deliberately reviewed. This is a static guard, not a substitute for runtime network inspection before release.
