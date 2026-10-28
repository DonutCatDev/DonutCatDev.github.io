# Phase 6 plan: quality automation

## Outcome

Make route, accessibility, markup, link, and performance regressions visible before changes reach `main`, while keeping the toolchain proportionate to a small static site.

## Current baseline

- `node:test` covers payout rules, route utilities, sheet parsing, external URL validation, route metadata, and sitemap membership.
- `scripts/dev/check-project.js` performs syntax and repository-invariant checks.
- GitHub Actions runs the unit and static checks on pushes and pull requests.
- Local preview uses only Node built-ins and reproduces the GitHub Pages 404 handoff.
- There is no controlled browser, accessibility engine, HTML validator, link checker, visual regression suite, or performance budget.

## Workstream 1: deterministic dependencies

1. Add development dependencies at exact or lockfile-controlled versions.
2. Replace `npm install` in CI with `npm ci` once dependencies exist.
3. Enable Dependabot for npm and GitHub Actions on a conservative schedule.
4. Group low-risk development updates and keep runtime dependency updates separate.
5. Document the supported Node LTS line in README, CI, and `package.json`.

## Workstream 2: browser smoke coverage

Adopt Playwright with Chromium first. Add Firefox/WebKit only after the Chromium suite is stable and the additional signal justifies the CI cost.

Test at minimum:

- Home and all section routes render one `h1`.
- Every configured route can be reached through navigation.
- Direct deep-link fallback lands on the requested route.
- Back and Forward restore route content and active navigation state.
- Legacy aliases replace the URL with the canonical route.
- Mobile navigation and each submenu work by keyboard and pointer.
- Escape closes open navigation and returns focus appropriately.
- Route transitions update title, canonical URL, description, focus, and `aria-current`.
- Repeated visits to a module page leave only one ag-Grid dependency script and no stale grid instance.
- Calculator defaults and representative changes match unit-tested results.
- Iframes have titles and direct fallback links.
- Unknown routes show the local 404 view and `noindex` metadata.

Mock Google and CDN requests for deterministic tests. Keep one optional integration job for real external services rather than making every pull request depend on them.

## Workstream 3: accessibility automation

1. Run axe against home, each section, calculator, both grid states, one embed, and not-found content.
2. Fail on serious and critical violations immediately.
3. Track moderate findings with explicit issues rather than an unbounded ignore list.
4. Add DOM assertions for one `h1`, landmark names, iframe titles, live regions, and form labels.
5. Keep manual keyboard, screen-reader, zoom, and forced-colors checks in the release checklist because automation cannot replace them.

## Workstream 4: markup, stylesheet, and link validation

- Add standards-based HTML validation for `index.html` and `404.html`.
- Parse `sitemap.xml` as XML and verify canonical uniqueness.
- Add ESLint with browser and Node overrides rather than maintaining a large homegrown style checker.
- Add Prettier in check mode for supported text formats.
- Consider Stylelint after Phase 4; do not add it before the component CSS settles.
- Check internal file references on every pull request.
- Check external links on a schedule with retries and a small allowlist for services that reject automated clients.

## Workstream 5: performance budgets

After Phase 4 assets stabilize, define budgets for:

- Total transferred bytes for the home route before external embeds.
- Largest Contentful Paint and Cumulative Layout Shift in a consistent lab profile.
- JavaScript shipped by the site itself.
- Number of third-party origins and requests.
- Image dimensions and compression.

Run Lighthouse CI on the home page, calculator, and one grid route. Use realistic thresholds with a small regression margin; do not chase a perfect score at the cost of maintainability or data-grid utility.

## Workstream 6: workflow design

Recommended pull-request jobs:

1. `unit-and-static`: lockfile install, formatting, lint, syntax, unit tests, markup, sitemap.
2. `browser-smoke`: local preview plus deterministic Playwright routes.
3. `accessibility`: axe against representative states; may share the browser installation cache.
4. `performance`: only for changes touching HTML, CSS, JS, or public assets, or run as a nonblocking report until budgets mature.

Recommended scheduled jobs:

- External link check.
- Real spreadsheet/CDN integration smoke.
- Dependency review/update automation.

Upload traces, screenshots, and reports only on failure and retain them briefly to limit storage noise.

## Acceptance criteria

- A pull request cannot merge with failing unit, syntax, formatting, markup, deterministic browser, or serious accessibility checks.
- Each canonical route is represented by either a browser test or a generated route matrix test.
- External-service instability does not randomly fail ordinary pull requests.
- CI completes quickly enough for a small personal site; target the core jobs at under five minutes with warm caches.
- Local commands match CI commands exactly and are listed in `AGENTS.md` and README.
- Test exceptions have a reason, owner, and removal condition.

## Risks and mitigations

- **Tooling becomes larger than the site:** prefer a small set of high-signal tools and avoid overlapping linters.
- **Browser tests become flaky:** mock external calls, wait on explicit UI states, and avoid timing-based sleeps.
- **Snapshots freeze accidental design:** use narrow screenshots only for stable components; prefer semantic assertions for behavior.
- **Performance results fluctuate:** pin the environment and use budgets wide enough to catch regressions rather than normal variance.

## Suggested commits

1. `test: add deterministic browser route coverage`
2. `test: add automated accessibility checks`
3. `chore: add formatting markup and link validation`
4. `ci: enforce browser and accessibility quality gates`
5. `ci: establish site performance budgets`
