# App review implementation plan

Date: 30 September 2026  
Status: implementation complete; acceptance limitations recorded in close-out  
Strategy: vertical slices, with security dependency updates first  
Scope: findings from the application review in this chat

## Intended outcome

- Resolve known dependency advisories through supported package updates and regenerated assets.
- Preserve every JSON field when exporting CSV.
- Keep Markdown previews within their declared browser-only processing boundary.
- Keep search text, the URL and displayed results in agreement.
- Convert wall-clock dates correctly across daylight-saving transitions.
- Ensure the newest PDF selection owns document state, thumbnails and edits.
- Keep the homepage usable when stored favourites are invalid or storage fails.
- Make privacy copy, input labels and copy feedback consistent in the reviewed flows.
- Update routine dependencies in separate, reversible batches after functional regressions are covered.

This is a remediation plan for a sampled review. Completion does not imply an exhaustive audit of every tool or proof that each dependency advisory is exploitable in this application.

## Repository context and execution rules

There is no `.engineering/config.yaml` or established feature-spec estate. Save this plan under the existing `.docs` area; no engineering setup or standalone specs are prerequisites. The requirements below are the scoped behaviour contract. Every chunk cites its requirement IDs rather than nonexistent spec paths. If relevant specs are introduced before execution, reconcile and cite them without expanding scope.

The initial review had 320 passing tests. Its final typecheck passed. Footer changes and the Mermaid tool were being developed concurrently. Preserve those changes and re-read the working tree before implementation, especially `package.json`, `pnpm-lock.yaml`, `lib/tools.ts` and `lib/tool-processing.ts`.

- Use the pinned `pnpm@11.6.0`; preserve the seven-day minimum release age and time-based resolution except for narrowly documented security exceptions.
- Check live release tags and advisories at execution time. Versions from the review are historical candidates, not instructions to install a stale or unreleased version.
- Edit package declarations and overrides first, then regenerate the lockfile with pnpm. Never hand-edit generated workers, lockfiles, build output or snapshots.
- Use `pnpm run sync:pdf-worker` to regenerate the public PDF.js worker.
- Run networked `gh` commands outside the sandbox on the first attempt if GitHub work becomes necessary. Do not infer invalid authentication from sandbox failures.
- Work in one reviewable chunk at a time. No force-push, history rewriting, deployment or unrelated dependency upgrades.
- Format only changed files. Keep scratch fixtures, audit output and browser captures outside the repository unless they become intentional test fixtures.
- For each functional bug, first capture the failure in a meaningful regression test at the narrowest suitable layer. Existing Node tests are the default for pure helpers. Use browser verification for UI behaviour; introduce a small browser/component harness only when needed for durable coverage, not an entire new test platform.

## Behaviour contract and coverage map

| ID       | Required behaviour                                                                                              | Chunks |
| -------- | --------------------------------------------------------------------------------------------------------------- | ------ |
| DEP-1    | Patched framework/runtime dependencies, regenerated assets and triaged residual advisories                      | A1–A3  |
| CSV-1    | CSV includes the stable union of keys across all object rows; missing cells remain empty                        | B1     |
| MD-1     | Rendering pasted Markdown never automatically requests remote resources                                         | B2     |
| PDF-1    | Only the current load can publish document, thumbnails, errors or loading state; reset invalidates pending work | B3     |
| PDF-2    | A replacement document never inherits page-specific edits or stale document errors                              | B4     |
| SEARCH-1 | Typing, clearing and navigation keep the input, query parameter and results consistent                          | B5     |
| TZ-1     | Conversion depends on the source zone and wall time, not the browser's zone; Now represents the current instant | B6     |
| STORE-1  | Invalid/unavailable storage cannot crash the homepage; favourites still work for the session                    | B7     |
| COPY-1   | Reviewed copy actions share feedback, accessible names and failure handling                                     | C3     |
| A11Y-1   | Reviewed tool input/output fields have persistent labels or accessible names                                    | C2     |
| PRIV-1   | FAQ, JSON-LD, disclosures and developer guidance describe the same processing boundaries                        | C1     |
| DEP-2    | Routine updates remain compatible with complete user flows and the production build                             | D1–D4  |

## Phase map

| Phase | Focus                                    | Demonstrable milestone                                                                                                                             |
| ----- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| A     | Security dependency maintenance          | The app builds with patched dependency paths; PDF thumbnails and Markdown previews still work; each remaining advisory has a recorded disposition. |
| B     | Functional correctness                   | Conversion retains data, previews respect locality, search and favourites are robust, and PDF/date tools operate on the intended inputs.           |
| C     | Consistency                              | Users receive matching privacy information, labelled fields and reliable copy feedback in the reviewed tools.                                      |
| D     | Routine updates and release verification | Updated dependency batches pass their flow checks and the assembled app passes the release gates.                                                  |

## Phase A — Security maintenance

### A1 — Patch Next.js

- **Depends on:** none; first executable chunk.
- **Spec(s):** this plan, DEP-1.
- **Work:** Recheck the published Next.js release and official advisories; update `package.json` with a patched stable version and regenerate the lockfile. Check peer compatibility and avoid a React upgrade unless required for the patch. Review `app/tools/opengraph-image.tsx`, middleware and supported metadata conventions for required compatibility changes. The review installed 16.2.12 and saw 16.3.6; the September 30 notice expected 16.3.8, which must be verified before selection.
- **Done when:** targeted lint/typecheck and `pnpm build` pass. In the running app, open the homepage, a tool page and the tools OG image endpoint; verify navigation, breadcrumbs and image rendering. The framework advisories from the review are resolved or explicitly assessed with version and preconditions. Document any narrowly needed release-age exception.
- **Out of scope:** framework redesign, general performance work, unrelated React upgrades, or claiming static OG content proves security against every framework advisory.

### A2 — Patch PDF.js and DOMPurify

- **Depends on:** A1.
- **Spec(s):** this plan, DEP-1.
- **Work:** Update `pdfjs-dist` and `dompurify` to compatible patched releases. Regenerate the PDF worker via the owning script. Compare worker/library versions and bytes against the installed package. Review PDF.js rendering API changes and sanitizer output changes. Review candidates were PDF.js at least 6.2.108 (latest then 6.3.289) and DOMPurify 3.4.15.
- **Done when:** PDF-related tests and typecheck pass. In the browser, load a multipage PDF, inspect thumbnails and export one page as an image; no worker mismatch appears. Markdown renders safe formatting and strips event handlers/script content. Record advisory reachability separately from version remediation.
- **Out of scope:** changing PDF workflows, enabling PDF scripting, hand-editing the worker, or implementing the remote-resource policy from B2 here.

### A3 — Resolve transitive security debt

- **Depends on:** A2.
- **Spec(s):** this plan, DEP-1.
- **Work:** Run a fresh full audit, including the now-present Mermaid dependency. Trace advisory paths to owning packages. Update MCP SDK/Blob or other owning packages when that resolves affected paths; otherwise use compatible targeted overrides in `pnpm-workspace.yaml`. Review the stale overrides for `fast-uri`, `hono`, `qs`, `js-yaml`, `brace-expansion`, `sharp` and `ip-address`, plus flagged `undici`, `nanoid`, Browserslist and build-tool dependencies. Divide into runtime and development-package sub-batches, regenerating and auditing after each. Remove an override only after proving the resolved tree no longer needs it.
- **Done when:** no fixable known advisory from the review remains unresolved; any residual advisory has its dependency path, affected feature/preconditions, available fix and next action recorded. Tests/typecheck/build pass. Exercise MCP authentication rejection locally; use mocked storage for generation/cleanup regression checks rather than writing public blobs. Verify the Markdown-to-PDF browser export and a diagram render remain functional.
- **Out of scope:** blanket `audit --fix`, speculative security claims, public storage writes during checks, or broad upgrades not required to resolve affected paths.

## Phase B — Fix functional bugs

### B1 — Preserve JSON-to-CSV columns

- **Depends on:** A3, to establish a stable dependency baseline.
- **Spec(s):** this plan, CSV-1.
- **Work:** Add `tests/csv-json.test.mts` regression coverage. In `lib/csv-json/convert.ts`, collect object keys across all rows in first-seen order and supply explicit columns to Papa Parse. Keep arrays-of-rows behaviour intact. Missing properties produce empty cells; retain delimiter and quoting behaviour. Update the inconsistent same-shape message if appropriate.
- **Done when:** `[{"a":1},{"a":2,"b":3}]` exports headers `a,b` and preserves `3`. Cover later-only keys, missing keys, false/zero/null, quoting and supported delimiters. In CSV ↔ JSON Converter, paste the example, inspect the output, copy/download and verify both columns survive.
- **Out of scope:** spreadsheet formula protection, flattening nested JSON, changing data types, or unrelated CSV whitespace semantics.

### B2 — Keep Markdown previews local

- **Depends on:** A2; execute after B1 in the default order.
- **Spec(s):** this plan, MD-1.
- **Work:** Define a sanitised preview policy in `lib/shared/markdown.ts` that removes remote loading sources, including relevant `src`/`srcset` and raw-HTML resource cases. Apply it to both Markdown Preview and Markdown-to-PDF live previews. Preserve ordinary links as explicit navigation and retain safe embedded images only when they meet the policy. Use a non-networking placeholder or explanatory text for blocked remote images. Add browser-backed sanitization/resource regression coverage; the existing raw-fetch inventory is insufficient.
- **Done when:** Markdown `![x](https://example.com/image.png)` and raw HTML image cases cause no requests to their hosts on render in either page. Query-string tokens remain local. Headings, lists, tables, links and supported embedded images still display correctly. PDF generation retains its existing embedded-image behaviour. Verify requests against test fixtures/intercepted hosts and distinguish them from analytics or same-origin runtime assets.
- **Out of scope:** a remote-image proxy, opt-in external image loading, making the whole site network-free, or removing useful Markdown formatting.

### B3 — Make PDF loading and reset deterministic

- **Depends on:** A2; execute after B2 in the default order.
- **Spec(s):** this plan, PDF-1.
- **Work:** In `hooks/use-pdf-document.ts`, identify each load generation. Guard every document, thumbnail, error and finally update against the active generation. Reset/unmount invalidate pending work. Clear or disable stale document actions when accepting a replacement. Cancel/destroy superseded rendering work where supported without letting cancellation corrupt the newer load. Add controlled asynchronous regression cases through an appropriate helper/hook harness.
- **Done when:** starting A then B and completing in either order always leaves B's filename, bytes, page count and thumbnails coherent. A stale failure cannot clear B or change its loading flag. Reset during parsing/rendering leaves an empty state after all tasks finish. In a PDF tool, rapidly replace a larger document with a small one and verify the small document remains active.
- **Out of scope:** redesigning every PDF tool, concurrent multi-document processing, or expanding file size limits.

### B4 — Reset document-specific PDF edits on replacement

- **Depends on:** B3.
- **Spec(s):** this plan, PDF-2.
- **Work:** Fix Rotate PDF first. Audit direct `usePdfDocument` consumers for the same replacement pattern and define a document-acceptance/reset boundary. Clear page-specific rotation/selection/order state, previous results and document errors for verified affected consumers. Preserve deliberate global preferences such as target page size. Start with Rotate, Delete Pages, Extract Pages and Rearrange; further verified consumers go into explicitly recorded sub-batches of at most four pages.
- **Done when:** rotate A then upload B: B has no inherited rotations. Select pages on A then replace with a shorter B: no selection from A is applied. Rearrange resets even when A and B have equal page counts. A failed replacement displays a clear state with no actionable edits from A. Download B from each changed flow and verify only B's requested edits appear.
- **Out of scope:** wiping reusable preferences, fixing unverified unrelated PDF behaviour, or silently turning this into a rewrite of the PDF estate.

### B5 — Synchronise homepage search

- **Depends on:** A1; execute after B4 in the default order.
- **Spec(s):** this plan, SEARCH-1.
- **Work:** Give `components/tools-search.tsx` a controlled draft value. Debounce URL updates, synchronise external query changes without interrupting typing, and cancel obsolete timers on clear/unmount/navigation. Preserve unrelated URL parameters and scroll behaviour. Add a UI regression for typed search followed by clear.
- **Done when:** type `base64`, wait for filtering, click Clear: input is empty, `q` is absent and all tools return. Rapid typing does not lose characters. Loading a bookmarked `?q=pdf` populates the field. Navigation between differing query URLs keeps field/results aligned; a pending timer cannot redirect after leaving home.
- **Out of scope:** new search ranking, tags, fuzzy search or homepage layout changes.

### B6 — Correct zone conversion and Now

- **Depends on:** A3; execute after B5 in the default order.
- **Spec(s):** this plan, TZ-1.
- **Work:** Extract conversion into a tested helper under `lib`. Resolve wall time against its source zone independently of the browser zone, with a verified algorithm or a justified compatible dependency. Format Now in the selected source zone. Adopt the proposed policy below for gaps and overlaps and provide clear feedback where needed. Avoid another single-offset estimate.
- **Done when:** the New York `2026-03-08T03:30` case equals `07:30Z` in browsers running London and UTC. Cover spring gaps, autumn overlaps, ordinary dates, London transitions and half-hour offsets. Now gives the same instant across selected source zones, allowing input precision. In the browser, enter a gap and overlap and verify the stated policy and visible feedback.
- **Out of scope:** calendar/scheduling features, widening the zone catalogue, or shipping an untested DST workaround.

### B7 — Make favourites resilient

- **Depends on:** A1; execute after B6 in the default order.
- **Spec(s):** this plan, STORE-1.
- **Work:** Reuse a validated parser in the render path of `hooks/use-favourites.ts`. Guard storage reads/writes and provide a stable in-memory snapshot when persistence is unavailable. Preserve the existing storage key and valid favourite lists. Handle same-tab updates and relevant cross-tab storage events, including clear. Add invalid JSON/shape and storage exception regressions.
- **Done when:** `broken`, `{}`, `null` and mixed arrays in saved data cannot crash home. Valid strings survive; invalid entries are ignored. With reads or writes blocked, favourites toggle and sort correctly for the current session. Existing saved favourites load after hydration without warnings. Verify normal reload persistence and cross-tab update behaviour with usable storage.
- **Out of scope:** migrating every persisted-state consumer, cloud sync, accounts or clearing unrelated browser data.

## Phase C — Make reviewed flows consistent

### C1 — Align privacy statements and documentation

- **Depends on:** B2.
- **Spec(s):** this plan, PRIV-1.
- **Work:** Update `lib/seo/home-faq.ts`, corresponding visible FAQ/JSON-LD output, `PRIVACY.md`, `CLAUDE.md` and relevant README copy. Describe local processing plus disclosed IP/third-party lookups and the separate MCP server integration. Use `lib/tool-processing.ts` as the inventory and reflect B2's blocked remote-image policy. Keep the existing differences between processing data and global page analytics explicit.
- **Done when:** the homepage no longer claims every tool is exclusively local. My IP, Domain Inspector and Logo Generator disclosures match the FAQ and privacy inventory. Visible FAQ and JSON-LD agree. Browser tests verify Markdown stays within its classification. Documentation accurately describes the server routes.
- **Out of scope:** rewriting all site copy, publishing legal policies, or changing the network tools' functionality.

### C2 — Label the reviewed input and output controls

- **Depends on:** B5.
- **Spec(s):** this plan, A11Y-1.
- **Work:** Add associated labels or accessible names to Base64 and URL Encode/Decode inputs/outputs. Check the touched search, timezone and copy controls for correct names. Use existing HTML Entities/Diff Viewer patterns and `components/ui/label.tsx`; retain placeholders as examples.
- **Done when:** empty and filled fields retain understandable names; label clicks focus the intended editable control. Keyboard users reach inputs and actions in sensible order. Verify the running pages at narrow width and inspect accessible names. No ID collisions occur.
- **Out of scope:** a whole-app accessibility certification, colour/typography redesign, or unrelated component-library migration.

### C3 — Standardise copy feedback in the reviewed flows

- **Depends on:** C2.
- **Spec(s):** this plan, COPY-1.
- **Work:** Introduce a small shared clipboard hook/control as needed; use `Copy`, `Copied` and a readable copy-failure message consistently. Add accessible names to icon-only `CopyableRow` actions. Migrate Base64, URL Encode/Decode, HTML Entities and Markdown Preview plus shared `CopyableRow` consumers, preserving each action's payload. Handle permission rejection/unavailable clipboard, clean up feedback timers and avoid an old request resetting a newer copy action.
- **Done when:** reviewed pages show success only after the write succeeds. A rejected write gives visible, accessible feedback without an unhandled rejection and leaves content available for manual selection. Repeated copies behave predictably. Shared row buttons identify the field they copy. Verify payloads and keyboard operation in the browser; test failure/overlapping request behaviour at the helper layer.
- **Out of scope:** replacing every independent clipboard handler in one pass, adding a clipboard permission prompt, or copying private data into a remote service. Record remaining consumers for later migration rather than implying complete adoption.

## Phase D — Routine dependency updates and final verification

### D1 — Update conversion/parser libraries

- **Depends on:** B1, B2, B6, C1 and A3.
- **Spec(s):** this plan, DEP-2; preserve CSV-1, MD-1 and TZ-1.
- **Work:** Recheck and update eligible compatible versions of `papaparse`, `fast-xml-parser`, `yaml`, `cronstrue`, `client-zip`, `marked`, `@peculiar/x509` and `zod`. Skip already-updated packages; document packages held for release-age or compatibility reasons. Use small sub-batches with relevant existing tests, not a single indiscriminate latest upgrade.
- **Done when:** converter/security/cron tests pass. In the browser, verify CSV union-key export, XML/YAML conversion, cron preview, certificate decoding, ZIP download and both Markdown preview/PDF output. No local-processing regression appears.
- **Out of scope:** unsupported major upgrades, converter feature expansion or bypassing release-age policy for routine updates.

### D2 — Update React and UI families

- **Depends on:** C2, C3 and A3.
- **Spec(s):** this plan, DEP-2; preserve SEARCH-1, STORE-1, A11Y-1 and COPY-1.
- **Work:** Update React, React DOM and matching type definitions together. Update Base UI, Radix UI and `tailwind-merge` in a separate sub-batch. Verify peer requirements and preserve the existing component API/interaction model. Run typecheck and build for each sub-batch.
- **Done when:** search clear, favourites hydration, clipboard feedback and Markdown updates still work. Open a select, dropdown, theme menu and alert dialog; verify keyboard focus, dismissal and light/dark rendering. Test one Base UI combobox flow and representative PDF controls. No hydration/runtime errors appear.
- **Out of scope:** switching primitive libraries, redesigning shadcn components, or updating packages already settled in phase A without new evidence.

### D3 — Update remaining compatible tooling/runtime packages

- **Depends on:** D1 and D2.
- **Spec(s):** this plan, DEP-2.
- **Work:** Recheck compatible updates for `memfs`, `prettier`, `terser`, `oxlint`, `oxfmt` and `shadcn`. Verify which are imported by application converters before classifying them as development-only. Keep the existing lint/format configuration. Record TypeScript 7 and Node typings 26 as deferred upgrade proposals; confirm the actual development/deployment Node versions before proposing types alignment.
- **Done when:** lint/typecheck and relevant web-code/SQL/converter tests pass. Format checking of changed files passes without formatting the repository. Browser formatting/minification flows retain valid output and error messages. Record remaining outdated packages with a reason for holding them.
- **Out of scope:** automatic shadcn regeneration of components, repository-wide formatting, a Node runtime migration, or TypeScript 7 adoption.

### D4 — Verify the assembled app and close the plan

- **Depends on:** all previous chunks.
- **Spec(s):** every requirement in this plan.
- **Work:** Run `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, a fresh audit and format checking scoped to changed files. Recheck that PDF worker output matches its package. Perform the manual acceptance flows for all changed user-facing chunks against the final build. Inspect the complete implementation diff and generated diffs, preserve concurrent work and remove scratch artefacts. Record validation evidence and any residual advisories/deferred updates here or in an intentional close-out report.
- **Done when:** all regressions pass on the assembled dependency set. Every chunk has its acceptance evidence; any existing/concurrent warning is clearly distinguished from a new regression. Network verification proves pasted Markdown cannot initiate remote resource requests. Final production build succeeds. No finding is marked resolved merely because its code was edited.
- **Out of scope:** deploying, merging, pushing, opening a PR without a request, claiming a whole-app security guarantee, or fixing newly discovered unrelated issues without separate scoping.

## Execution order and dependencies

Default sequential order:

`A1 → A2 → A3 → B1 → B2 → B3 → B4 → B5 → B6 → B7 → C1 → C2 → C3 → D1 → D2 → D3 → D4`

The prerequisite graph is less restrictive than that sequence: B1/B2/B3/B5/B6/B7 are largely independent once the security baseline lands; B4 requires B3. C1 requires B2; C3 requires C2. Routine dependency batches land after the relevant regressions exist. All package/lockfile mutations remain serial. This describes logical independence, not an instruction to spawn agents.

Milestones:

- After A3, the app has a triaged patched dependency baseline.
- After B7, all seven reported functional findings have verified fixes.
- After C3, the reviewed privacy/accessibility/copy flows share consistent behaviour.
- After D4, the complete change is ready for release review with explicit residual risk and deferrals.

## Decisions and deferrals

These are proposed implementation defaults, recorded so the executor does not quietly invent behaviour. User steering takes precedence.

| Topic                                              | Status                    | Resolution / owner                                                                                                                                     |
| -------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CSV rows with different keys                       | Proposed default          | Export union of keys in first-seen order, rather than reject valid data. Missing values are empty cells.                                               |
| Remote Markdown images                             | Proposed default          | Block automatic remote loading. Preserve safe embedded images; no opt-in external loader in this scope.                                                |
| Nonexistent DST wall times                         | Proposed default          | Reject with a clear explanation; do not silently shift the user's time.                                                                                |
| Ambiguous DST wall times                           | Proposed default          | Choose the earlier occurrence and display that choice. Pin it in tests; widen UI choice only if requested.                                             |
| Storage unavailable                                | Proposed default          | Session-only favourites remain usable; valid persisted data keeps its existing format/key.                                                             |
| PDF settings on replacement                        | Proposed default          | Clear document-specific edits/errors; preserve deliberate reusable settings. Inventory verified consumers in B4.                                       |
| Copy rollout extent                                | Scoped                    | Shared rows plus four reviewed text tools; remaining independent handlers are follow-up work.                                                          |
| Patch versions and security release-age exclusions | Execution-time decision   | Executor verifies current official advisories, release availability, peer constraints and minimal exclusions in A1–A3.                                 |
| TypeScript 7 / Node typings 26                     | Deferred                  | Separate compatibility work, not bundled into routine updates. Record reasons and an upgrade proposal in D3.                                           |
| New time-zone dependency                           | Conditional               | Prefer a tested solution that fits the stack. If a dependency is needed, justify size/support and verify permissive licensing, including bundled code. |
| Mermaid/footer work                                | External work in progress | Preserve it. Include installed dependencies in audits and flow smoke checks; do not take over unrelated feature work.                                  |
| Spec estate / engineering setup                    | Out of scope              | The addressable behaviour contract above is sufficient for this remediation plan.                                                                      |

## Per-chunk completion checklist

- [ ] Read the current working tree and applicable repository instructions.
- [ ] Reproduce the targeted functional failure before fixing it; add the narrow regression where warranted.
- [ ] Implement only the chunk's declared work; preserve unrelated/concurrent changes.
- [ ] Run relevant checks and the chunk's running-app acceptance steps.
- [ ] Inspect source and owning-tool-generated diffs; format only in-scope files.
- [ ] Record requirement IDs, evidence, residual issues and any justified dependency exception.
- [ ] Update chunk completion below; update spec behaviour badges only if real governing specs have been introduced.
- [ ] No database migrations are expected. If a chunk unexpectedly needs one, stop that expansion and scope it separately.

## Progress

- [x] A1 — Next.js patch
- [x] A2 — PDF.js / DOMPurify patches
- [x] A3 — Transitive security debt
- [x] B1 — CSV columns
- [x] B2 — Local Markdown previews
- [x] B3 — PDF request ownership
- [x] B4 — PDF edit reset
- [x] B5 — Search synchronisation
- [x] B6 — Time zone correctness
- [x] B7 — Resilient favourites
- [x] C1 — Privacy/docs consistency
- [x] C2 — Input/output labels
- [x] C3 — Shared copy feedback
- [x] D1 — Parser/converter updates
- [x] D2 — React/UI updates
- [x] D3 — Remaining compatible updates
- [x] D4 — Integrated release verification

## Review sources

The full review and its reproductions are in the preceding chat; its temporary report was `/private/tmp/toolkit-app-review.md`. All acceptance-critical findings have been restated here so execution does not depend on that temporary file surviving.

- [Next.js September 22 security release](https://nextjs.org/blog/nextjs-security-update-september-22-2026)
- [Next.js September security release notice](https://nextjs.org/blog/upcoming-nextjs-security-release-september-2026)
- [PDF.js advisory](https://github.com/advisories/GHSA-hq66-cqwq-w95j)
- [DOMPurify advisory](https://github.com/advisories/GHSA-55q2-fjhq-7xh7)

Advisory counts and candidate versions in the earlier review were a point-in-time inventory. Refresh them during execution rather than treating them as permanent facts.

## Execution evidence

- **A1 — 30 September 2026:** Next 16.3.6 installed via pnpm 11.6.0; production build passed. Browser verified homepage→Base64 navigation, breadcrumb JSON-LD and 1200×630 OG route. 16.3.8 unpublished; recheck at D4.
- **A2 — 30 September 2026:** PDF.js 6.3.289 and DOMPurify 3.4.16 installed; pnpm generated security release-age exception and PDF worker. Worker byte comparison passed; 31 focused PDF tests passed. Browser rendered three thumbnails, exported page 1 (600×800), and verified sanitizer removes scripts/events.
- **A3 — 30 September 2026:** Audit: 0 advisories at every severity. Certificate/processing tests: 14 passed. Production build/typecheck passed; diagram rendered; MCP returned 401 for missing token. Markdown PDF action returned without visible error; IAB download-event capture timed out, so final download bytes remain to verify in D4. No public storage writes performed.
- **B1 — 30 September 2026:** Regression red: later object keys were lost. Green: three tests cover stable union, missing/false/zero/null values, quoting and all delimiters plus row arrays. Scoped lint/format passed. Browser output a,b / 1, / 2,3; Copy reported success (IAB clipboard capture unavailable); this page has no download control.
- **B2 — 30 September 2026:** Shared isolated sanitizer strips loading sources, CSS resource attributes and media tags; blocked images show text; embedded raster images and navigation links remain. Policy test and scoped checks passed. Both browser previews displayed blocked placeholders and embedded image; local external-origin fixture server received zero requests. PDF generation embedding policy unchanged. Browser harness limits recorded; repeat final production check in D4.
- **B3 — 30 September 2026:** Request controller owns every publish/finalizer and invalidates on reset/unmount. Controlled parse-success/failure, stale-thumbnail and reset tests pass (3 cases); PDF tests 16 passed total. AbortSignal cancels PDF.js loading/rendering. Scoped checks pass; browser replaced 3-page A with 2-page B and coherent thumbnails.
- **B4 — 30 September 2026:** Initial four flows now clear document edits/errors synchronously on replacement, including equal-count reorder. Audit found one extra batch: Split (ranges/errors), Resize (errors), Impose (errors/progress); reusable settings preserved. Other consumers already have replacement invalidation. Scoped checks passed. Browser A rotations and selected last page cleared on shorter B. Remaining extraction/reorder/download acceptance consolidated into D4.
- **B5 — 30 September 2026:** Controlled draft clears immediately; debounced writes acknowledge their own URL updates without overwriting later typing. External URL changes cancel timers; unmount cleanup and unrelated params preserved. Scoped checks passed. Browser bookmark pdf -> typed base64 -> single result -> Clear produced empty input and URL ?keep=1. Final browser regression repeated in D4.
- **B6 — 30 September 2026:** Pure Intl wall-time resolver matches candidates across surrounding offsets independently of host TZ. Three tests cover NY/London gaps and earlier overlap, ordinary/UTC/half-hour dates and Now. Browser gap rejected visibly; London overlap displayed earlier 00:30 UTC with explanation. Now stores its true minute instant even in overlap. Source/add-zone names fixed; scoped checks passed.
- **B7 — 30 September 2026:** Validated parser handles malformed/scalar/mixed data; memory snapshot survives storage getter/read/write exceptions. Tests cover notification, persistence and cross-tab clear semantics (3 passed). Scoped checks passed. Browser favourite toggled; reload/cross-tab browser checks continue in D4 because hydration is asynchronous.
- **C1 — 30 September 2026:** FAQ and shared JSON-LD now describe disclosed lookup/font/IP exceptions, local previews, MCP Blob storage and separate analytics. PRIVACY/README/manual CLAUDE overview aligned; generated Next rules preserved. Processing inventory tests 7 passed; scoped checks pass. Browser visible FAQ and JSON-LD identical; favourite persisted after reload.
- **C2 — 30 September 2026:** Visible associated labels now persist on Base64 and URL input/output; source/add-zone selectors named in B6 and search named already. Scoped lint/format passed. Browser empty/filled Base64 and empty URL accessible names correct, label focused input. Narrow-width review remains in D4.
- **C3 — 30 September 2026:** Clipboard controller covers rejection, delayed success, overlap, stale timers and unmount (3 tests). Base64/URL/HTML/Markdown plus 11 shared-row importing pages migrated; row actions identify labels. Scoped checks passed. Browser URL encoded payload and Copied feedback verified. Independent handlers (including local Byte/Chmod rows, browser sharing/My IP header and other tools) remain deliberately outside this migration.
- **D1 — 30 September 2026:** Eligible updates applied in two sub-batches: Papa/XML/YAML/cronstrue, then ZIP/marked/X509/Zod. 23 parser/cron and 18 certificate/locality/date tests passed. Browser XML→JSON, YAML→JSON, Monday cron preview and synthetic certificate decode passed. XML 5.11.2 held for release age. Markdown download-event capture unavailable; Safari native capture failed; final export generation/ZIP verification remains in D4.
- **D2 — 30 September 2026:** React/DOM/types 19.3.0 then Base UI 1.8/Radix 1.6.7/tailwind-merge 3.7 installed separately; both typechecks and production builds passed. Production theme dropdown/light mode and select keyboard selection passed. No reachable Base UI combobox or alert-dialog consumers exist outside unused primitives; no artificial UI introduced. Search/favourites/copy/PDF flow rechecks consolidated into D4. In-app blob download capture remains unavailable.
- **D3 — 30 September 2026:** Eligible memfs 4.79, Prettier 3.9.8, Terser 5.51.2, oxlint 1.85, oxfmt 0.70 and shadcn 4.21 installed via pinned pnpm; no component regeneration. Web/SQL/TypeScript conversion tests: 28 passed. Node v24.19.0 locally; deployment Node not pinned in repo and could not be confirmed here. TypeScript 7 and Node 26 types deferred; newer age-ineligible memfs/XML/ox tools held. Full lint/types and browser tooling covered in D4.
- **D4 — 30 September 2026:** Final types, lint, 338 tests, build and fresh zero-advisory audit pass; generated worker matches. Final browser CSV/locality/search/favourites/formatter checks and real PDF/ZIP downloads verified. Mocked server PDF/Blob upload and paginated cleanup pass without public writes. Complete diff and plan requirement coverage reviewed; two self-review bugs fixed. Close-out records 34 existing/concurrent lint warnings, framework warnings, held dependencies and unavailable narrow-viewport verification.
