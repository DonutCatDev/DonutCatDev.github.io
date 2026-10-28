# Repository instructions for donutcat.org

## Purpose and priorities

This repository powers the public static site at `https://donutcat.org`. Preserve its playful personal voice while making its tools dependable, accessible, secure, and fast. Prefer straightforward browser-native solutions over framework or build-system complexity.

Priority order:

1. Correct calculations and accurate published data.
2. Safe handling of external spreadsheet and URL content.
3. Keyboard, screen-reader, mobile, and reduced-motion usability.
4. Reliable direct links and History API navigation on GitHub Pages.
5. Maintainable vanilla HTML, CSS, and JavaScript.

## Architecture

- `index.html`: shared document shell and HTML templates for top-level routes.
- `404.html`: GitHub Pages deep-link handoff to the SPA.
- `scripts/app.js`: application bootstrap, routing, navigation, metadata, and feature lifecycle.
- `scripts/site-config.js`: canonical route and section metadata.
- `scripts/features/`: page-specific mount functions.
- `scripts/lib/`: shared pure logic and browser utilities.
- `styles/main.css`: shared design tokens, layouts, components, and responsive behavior.
- `content/`: public static assets.
- `tests/`: Node built-in test-runner coverage for pure modules.
- `docs/development/`: audits, plans, decisions, and implementation notes.

## Architectural invariants

- Keep the deployed output compatible with static GitHub Pages. Do not introduce server-only behavior.
- Use vanilla JavaScript and native DOM APIs unless a dependency or framework migration is explicitly approved.
- Treat `scripts/site-config.js` as the source of truth for sections, subpages, route metadata, and legacy aliases.
- Root-relative public paths are intentional because the custom domain and user-site repository are served at `/`.
- Every interactive feature must expose a `mount(container)` function and return a cleanup function. Cleanup must abort requests, remove feature-owned listeners, and destroy third-party instances.
- Pin external runtime dependencies to an exact version.
- Never insert spreadsheet, URL, error, query-string, or other external values through `innerHTML`. Construct elements and assign `textContent`, validated properties, or safe attributes.
- Accept externally supplied links only after parsing them and confirming an allowed `http:` or `https:` protocol.
- Do not change payout formulas, fund rules, rounding behavior, or external data schemas without updating tests and `docs/development/` notes.
- Do not commit credentials, private spreadsheet data, tokens, generated reports, or local server artifacts.

## Common changes

### Add or change a route

1. Update the applicable entry in `scripts/site-config.js`.
2. Add or update the top-level template in `index.html` only if the section shell changes.
3. For an interactive page, add a module in `scripts/features/` exporting `mount(container)`.
4. Add the canonical URL to `sitemap.xml` when it should be indexed.
5. Add or update route and browser smoke tests.
6. Verify a direct refresh, in-app navigation, browser Back/Forward, and repeat visits.

### Add or change a spreadsheet-backed grid

1. Configure the sheet ID, sheet name, title, and introduction in a small feature module.
2. Reuse `scripts/lib/sheet-grid.js`; do not copy its loader, parser, or grid setup.
3. Confirm public read access and the expected header schema.
4. Exercise loading, empty, malformed-response, network-error, and retry states.
5. Confirm links from cells are protocol-validated and open with `noopener noreferrer`.

### Change calculator rules

1. Change the pure logic in `scripts/lib/prizing.js` before changing presentation code.
2. Add table-driven coverage for every new or changed rule.
3. Confirm all payouts plus the fund and guarantees reconcile to the total pool.
4. Document the rule source or product decision in `docs/development/decisions/`.

## Accessibility and interface requirements

- Every route needs one descriptive `h1`.
- SPA navigation must update the title, description, canonical URL, active navigation state, and route announcement.
- Programmatic route changes must move focus to the new page heading without disrupting the first page load.
- All controls must be usable by keyboard and touch, have accessible names, and show a visible focus indicator.
- Iframes require a useful `title` and a direct fallback link.
- Do not communicate status through color alone.
- Respect `prefers-reduced-motion`.
- Repeated decorative imagery should use empty alternative text; meaningful imagery needs concise alternative text.

## CSS conventions

- Reuse custom properties and component classes in `styles/main.css`.
- Avoid inline style attributes and feature-injected style elements.
- Design mobile-first and check narrow, wide, zoomed, and high-contrast presentations.
- Preserve the navy/light identity unless an intentional redesign is part of the task.

## Verification

From the repository root, run:

```text
npm test
npm run lint
```

Preview through an HTTP server rather than opening `index.html` from disk. For example:

```text
npm run preview
```

Minimum manual smoke routes:

- `/`
- `/bey`
- `/bey/prizing-calculator`
- `/bey/dmvbx-topcut-data`
- `/foam`
- `/foam/fps-energy`
- `/printing`
- `/printing/print-filament-grid`
- an unknown route

When browser or network verification is unavailable, run every remaining static/unit check and state the limitation in the handoff.

## Definition of done

- Direct refresh and client navigation both work.
- Back/Forward and legacy aliases preserve the correct canonical route.
- Repeat navigation does not duplicate scripts, styles, listeners, or grid instances.
- Loading, empty, invalid, and external-service failure states remain usable.
- Relevant unit and smoke tests pass.
- Keyboard and mobile behavior are verified for changed interfaces.
- Metadata, sitemap entries, and documentation remain synchronized.
- The working tree contains no unrelated edits or generated artifacts.

## Git and collaboration safety

- Inspect `git status` before editing and preserve unrelated user changes.
- Keep commits focused and describe user-visible or architectural effects.
- Avoid destructive Git operations.
- Do not push, deploy, publish, or alter remote settings unless explicitly requested.
