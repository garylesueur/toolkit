# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A collection of browser-based developer utilities, deployed at https://toolkit.lesueur.uk. Most tool input is processed locally. `lib/tool-processing.ts` defines the inventory: disclosed third-party lookups/fonts and the My IP server route are exceptions. The separate authenticated MCP server converts Markdown and stores generated PDFs in Vercel Blob. See `PRIVACY.md`; keep tool disclosures, visible FAQ and JSON-LD consistent with this boundary. Markdown previews block automatic remote resources. Global page-view analytics must never receive pasted input or file contents.

**Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui + Radix UI, Remixicon icons, pnpm.

## Commands

```bash
pnpm dev              # Dev server on port 3004
pnpm build            # Production build
pnpm lint             # oxlint
pnpm lint:fix         # oxlint --fix
pnpm format           # oxfmt
pnpm format:check     # oxfmt --check
pnpm typecheck        # tsc --noEmit
```

## Architecture

### Tool Registry (`lib/tools.ts`)

Single source of truth for all tools. Every tool must be registered here with name, description, href (`/tools/<slug>`), and Remixicon icon. This drives the home page grid, sitemap, search, and SEO metadata. Tools with `devOnly: true` are hidden in production.

### Tool Page Structure

Each tool lives in `app/tools/<slug>/` with two files:

- **`layout.tsx`** — Server component that exports metadata via `createToolMetadata("<slug>")` from `lib/tools-metadata.ts`
- **`page.tsx`** — Usually a `"use client"` component with the tool's interactive UI

### Feature Utilities (`lib/<feature>/`)

Complex tool logic is extracted into `lib/<feature>/` directories (e.g., `lib/pdf/`, `lib/csv-json/`, `lib/colour/`). These contain core logic, types, constants, and helpers separate from the UI.

### Shared UI

- `components/ui/` — shadcn/ui components (button, input, select, card, etc.)
- `components/copyable-row.tsx` — Reusable row with copy-to-clipboard
- `hooks/use-favourites.ts` — localStorage-backed favourites (SSR-safe)
- `hooks/use-pdf-document.ts` — PDF document state for PDF tools
- `lib/utils.ts` — `cn()` classname merger

## Adding a New Tool

1. Create `app/tools/<slug>/layout.tsx` with `export const metadata = createToolMetadata("<slug>")`
2. Create `app/tools/<slug>/page.tsx` (use `"use client"` for interactive tools)
3. If complex logic is needed, extract to `lib/<slug>/`
4. Register the tool in `lib/tools.ts` — it is not complete until registered
5. Run `pnpm lint && pnpm typecheck`

## Coding Standards (from .cursor/rules/)

- **No `any` or `unknown`** — use explicit types everywhere
- **Named exports only** — no default exports (except Next.js page/layout conventions), no barrel exports (`export *`)
- **No inline types** — define types/interfaces in dedicated declarations
- **Object factory over `class`** — avoid `this` binding issues
- **`for...of` over `.forEach()`** — allows break/continue
- **Comment the why, not the what** — prefer self-documenting code
- **Extract magic values** into named constants
- **Server components by default** — use `"use client"` freely for interactive tool pages
- **Semantic HTML over ARIA** — use native `<button>`, `<a>`, `<nav>` elements
- **Icon-only buttons must have `aria-label`**; decorative icons get `aria-hidden`

## Dependency Licensing

- Only add dependencies under permissive licences compatible with a proprietary application: MIT, BSD, ISC, or Apache-2.0.
- Do not add AGPL, GPL, or other copyleft dependencies, including WebAssembly builds or wrappers around copyleft software.
- Verify the licence of both the package and its bundled/native/WASM components before adoption. A wrapper's licence does not replace the licence of the software it distributes.
- If a dependency's licence is missing, unclear, dual-licensed, or outside the approved list, do not add it without the project owner's explicit approval after legal review.

## Quirks

- `pdf.worker.min.mjs` must exist in `public/` for PDF.js to work
- Dev server runs on port 3004, not 3000
- Linting uses oxlint (Rust-based), not ESLint; formatting uses oxfmt, not Prettier

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
