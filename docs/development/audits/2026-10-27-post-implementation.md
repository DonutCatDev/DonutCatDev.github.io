# Post-implementation engineering audit

Date: 2026-10-27

Scope: fresh review after implementing phases 0, 1, 2, 3, and 5 and committing the detailed plans for phases 4, 6, and 7.

## Executive assessment

The repository is materially safer and easier to change. It remains a buildless static GitHub Pages site, but route metadata is centralized, interactive features now have cleanup lifecycles, external spreadsheet content is rendered without HTML injection, the grid dependency is pinned, calculator rules are isolated, and automated tests protect the most error-prone pure logic.

No release-blocking static or unit-test failure was found in this sweep. The primary remaining release risk is incomplete real-browser verification: this environment could serve and probe the site but did not expose a supported browser-control surface for visual, keyboard, iframe, or third-party grid inspection.

## Verified state

- Working tree was clean at the start of the sweep.
- 16 Node tests passed.
- The repository syntax/invariant checker passed across 14 JavaScript files.
- `git diff --check` was clean before each completed implementation/planning commit.
- The local HTTP preview returned successful responses for the shell, stylesheet, application module, feature module, sitemap, and robots policy.
- A direct local deep route returned the expected GitHub Pages-style 404 handoff containing the `__route` transfer.
- Runtime-source scanning found no `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `eval`, `new Function`, or `document.write` usage.
- The ag-Grid runtime URL is pinned to 36.2.0.
- Read-only health probes returned HTTP 200 on 2026-10-27 for:
  - The pinned jsDelivr ag-Grid bundle.
  - Both Google Visualization spreadsheet feeds.
  - All five configured Foam embeds/Apps Script resources.

HTTP success does not prove that every cross-origin iframe renders correctly or that the spreadsheet schemas remain semantically correct; those require browser and contract checks.

## Improvements confirmed

### Governance

- Root `AGENTS.md` is now the authoritative engineering instruction set.
- README, editor/line-ending rules, ignore rules, package metadata, local preview, and CI are present.
- Development plans and audits have a dedicated durable directory.

### Reliability and security

- Route and subpage metadata moved from the router to `scripts/site-config.js`.
- Dynamic feature modules expose `mount(container)` and cleanup behavior.
- Both grids share one loader/parser/renderer instead of separate large implementations.
- Grid requests abort on cleanup, grid instances are destroyed, and the dependency loader is shared.
- External cell links use parsed HTTP(S) URLs and DOM construction.
- Google Visualization responses receive HTTP, JSON, status, and table-shape validation.
- Duplicate/blank spreadsheet headers are handled deterministically.
- Loading, empty, retry, and error states are present.

### Calculator

- Business logic is pure and separate from DOM rendering.
- Tests cover defaults, location rules, Top Cut guarantees, invalid attendance/TO values, insufficient pools, warnings, rounding, and full-pool reconciliation.
- Existing formulas were preserved rather than silently redesigned.

### Accessibility and discovery

- Routes have descriptive `h1` headings.
- Navigation exposes explicit submenu buttons and a mobile disclosure.
- SPA transitions update title, description, canonical URL, Open Graph fields, active navigation, focus, and a live announcement.
- Iframes have titles, lazy loading, sandboxing, explanatory copy, and direct fallback links.
- Reduced-motion, skip-link, not-found, and no-script behavior are present.
- `robots.txt`, `sitemap.xml`, default social metadata, canonical metadata, and WebSite structured data are present.

## New and residual findings

### Priority A: release verification

1. **Real-browser QA is still required.** Static serving cannot confirm layout, focus order, touch submenus, iframe compatibility, ag-Grid rendering, or actual assistive-technology output.
2. **Payout tests preserve the prior formulas but do not establish their business authority.** A tournament organizer should confirm the fund exemptions, fractional allocations, guarantees, and rounding remainder. Record that confirmation in a decision document.
3. **Spreadsheet availability is confirmed, but schema contracts are not documented.** Required headers and plausible minimum row counts should be recorded before scheduled contract checks can distinguish a valid change from a broken publication.

### Priority B: discovery architecture

1. **Deep routes still begin as an HTTP 404 on GitHub Pages.** JavaScript hands them to the SPA successfully for visitors, but crawlers and link unfurlers may treat the initial response as missing.
2. **Deep-route social metadata is client-updated.** Many social crawlers do not execute JavaScript, so a shared tool link may receive the root metadata or no useful preview.
3. **Sitemap entries therefore describe canonical routes that do not have native static 200 responses.** This is internally consistent with the SPA but not ideal search architecture.

Recommended resolution: add a small static route-generation/deployment step that emits an HTML shell with route-specific metadata for every configured route, then deploy that output through GitHub Pages Actions. Keep `scripts/site-config.js` as the generation source and retain the 404 handoff only for unknown or legacy routes.

### Priority C: presentation and performance

1. The home page remains image-first and does not yet explain the three resource areas visually.
2. Every project card reuses the same small decorative image.
3. The 315 by 337 source image is still stretched into large presentation contexts.
4. The Google Fonts request remains an avoidable privacy/performance dependency unless Phase 4 finds a material typography benefit.
5. `styles/main.css` is now 677 lines. It remains manageable but should be organized around Phase 4 component/tokens rather than continuing as a single undifferentiated append-only file.
6. The pinned ag-Grid bundle is loaded from a third party on first grid use. Vendoring or a controlled build output would improve outage resistance, while performance budgets should measure whether the full grid remains justified.

### Priority D: automation and operations

1. CI currently covers pure logic and static invariants but not browser behavior, accessibility rules, markup standards, formatting, external links, or performance.
2. External resources have no scheduled health or schema monitoring.
3. Domain, certificate, and GitHub Pages settings are not documented in the repository.
4. The repository has no explicit license. Copyright is reserved by default; an owner decision is required before granting reuse rights.
5. Branch protection and required checks are repository settings and were not inspected or changed.

## Security posture notes

- There are no repository secrets or authenticated runtime calls in the reviewed source.
- Spreadsheet content is no longer inserted as HTML.
- Cross-origin embeds remain inherently dependent on Google behavior and their configured sandbox allowances.
- A strict Content Security Policy would currently need to account for the inline 404 redirect and JSON-LD plus Google, jsDelivr, and iframe origins. GitHub Pages cannot set arbitrary response headers, so a CSP should be treated as a hosting/build decision rather than pasted in without testing.
- Subresource Integrity is not presently used for the dynamically loaded grid bundle. Exact version pinning reduces upgrade risk but does not provide integrity verification.

## Recommended next gate

Before manual push or immediately in a review branch:

1. Run the manual browser matrix in `post-implementation-priorities.md`.
2. Confirm the calculator rules with the responsible organizer.
3. Review the commit series and GitHub Actions workflow.
4. Push only after those user-controlled checks are acceptable.

After that gate, execute the Phase 5b static-route work before treating per-tool SEO/social sharing as complete, then continue with phases 4, 6, and 7 in the documented order.
