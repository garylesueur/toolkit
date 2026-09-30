# App review remediation close-out

Date: 30 September 2026
Status: implementation complete; verification completed with the limitations below
Scope: uncommitted implementation of `.docs/plans/app-review-remediation.md`; original footer, registry and Mermaid work preserved. No commits or publication performed.

## Self-review findings

The run-plan close-out reviewed the complete implementation diff and its callers against the scoped behaviour contract. There is no committed implementation branch or feature-spec estate, so the plan and working-tree baseline govern this review.

- **Major — PDF-2, seven changed PDF pages:** replacing a file clears existing edits/errors, but an already-running save can later publish its old error or trigger an old-document download. **Fixed:** saves now capture the loader generation; replacement/reset/unmount invalidates their downloads, errors and finalizers. A regression covers all three boundaries. This is a verified gap in the remediation, not an unrelated new feature.
- **Verification limitation — browser downloads:** the in-app browser did not deliver blob download events, although export actions returned without visible errors. Safari initialization succeeded but native capture subsequently failed. The generated file was subsequently found in Downloads with the current verification timestamp. It parses as a one-page PDF titled Quarterly Report, with the expected heading and sample body. The download-event limitation is a tooling issue; use actual downloaded artefacts for the remaining checks.
- **Major — CSV-1, missing prototype-named fields:** union columns initially read inherited properties on rows missing `constructor`, `toString` or `__proto__`. **Fixed:** own-property lookup returns an empty missing cell; a failing regression is now green.
- **Minor — existing framework warnings:** middleware convention deprecation and `metadata.themeColor` warnings predate these functional changes. No route migration is included in this plan.

## Dependency policy

Routine candidates were selected from official npm publication metadata using a conservative cutoff of 23 September 2026 at 00:00 UTC. The seven-day release-age and time-based resolution policy remains in place. DOMPurify 3.4.16 has a narrow security exception. Lockfile and PDF worker changes came from their owning tools.

TypeScript 7 and Node 26 types are deferred. Local Node is 24.19.0; the deployment Node version is not declared in this repository and has not been confirmed externally.

## Validation

The final assembled dependency set passed `pnpm typecheck`, `pnpm lint`, `pnpm test` (338 passed, zero failures/skips), and `pnpm build`. A fresh dependency audit reported zero advisories at every severity. The generated PDF worker matches the installed package byte for byte. Scoped formatting and whitespace checks passed. There is no configured knip/dead-code command; unused imports in the changed scope were checked through lint and diff review.

| Requirements             | Acceptance evidence                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CSV-1                    | Regression tests and final browser output preserve first-seen union columns, missing values and literal prototype-named keys.                                                                                                                                                                                                                                           |
| MD-1                     | Both final production Markdown previews retain embedded raster images and navigation links, replace remote images with placeholders, and strip resource-loading media/CSS. The local collector received zero fixture requests; a calibration request proved it was running.                                                                                             |
| PDF-1 / PDF-2            | Controlled loader/save tests cover replacement, reset and unmount ownership. Browser replacement clears selections/rotation/order, including equal page counts. Downloaded rotation, deletion, extraction and rearrangement PDFs have the expected page text/order/rotation; split ZIP integrity and entries passed. Markdown export parses as the expected titled PDF. |
| SEARCH-1                 | Browser query updates, immediate Clear, bookmarked query restoration and unrelated URL parameter preservation passed.                                                                                                                                                                                                                                                   |
| TZ-1                     | Gap rejection, explicit earlier overlap choice, host-zone independence and true-instant Now behavior are tested. Gap/overlap UI checks passed.                                                                                                                                                                                                                          |
| STORE-1                  | Malformed data and storage failures have regression coverage. Browser favourites persist after reload and synchronize across two tabs.                                                                                                                                                                                                                                  |
| PRIV-1 / A11Y-1 / COPY-1 | FAQ and JSON-LD match; processing/privacy descriptions align. Input/output names and label focus passed. Clipboard success/failure, payload changes, overlap and unmount are tested; successful browser feedback passed.                                                                                                                                                |
| DEP-1 / DEP-2            | Security audit is clean; parser, certificate, formatter, diagram, theme/select, navigation and production export flows passed on the upgraded set. Server PDF generation and mocked Blob upload/cleanup passed, including unauthorised rejection, pagination and expired-only deletion. No public blobs were written.                                                   |

Self-review found and fixed the stale PDF save and prototype-field CSV issues above. No unresolved major finding remains in the implementation scope. There is no separate feature-spec estate; requirement coverage was checked against this plan and the implemented tests/flows.

## Residual work and verification limits

- **Narrow viewport review remains unverified:** the in-app browser accepted its viewport override but the rendered document stayed at 1280px. Accessible names, empty/filled labels and label focus were verified; a real mobile-width visual pass remains a release-review follow-up.
- Lint exits successfully with 34 warnings in existing/concurrent patterns, including effects, refs, workers and Mermaid work. The new search ref warning found during close-out was fixed. Existing Next middleware and theme-color metadata warnings remain.
- Next 16.3.8 was still unpublished when rechecked at close-out. The September 22 patch is installed; the announced September 30 security release requires a separate follow-up when available. See the official release notices linked in the plan.
- The release-age policy holds newer Next, Prettier, memfs, XML and ox tool releases. TypeScript 7 and Node 26 types remain deliberate compatibility deferrals; deployment Node still needs confirmation.
- Clipboard adoption is scoped to shared rows and the four reviewed text tools. Independent handlers remain follow-up work as declared in the plan.
- IAB blob download events were unavailable. Actual downloaded files supplied export verification instead. No reachable application consumers exist for the unused Base UI combobox/alert-dialog primitives.

Detailed command logs, synthetic fixtures, screenshots and mock checks were kept outside the repository under `/private/tmp/toolkit-remediation/`. The only new repository documents are this close-out, the implementation plan and the skill checkpoint. Existing `.codex/`, footer and Mermaid changes were preserved. No commit, push, pull request or deployment was made.
