# Post-implementation priorities

This plan converts the fresh audit into an ordered next-work queue. It supplements, rather than replaces, the detailed phase 4, 6, and 7 plans.

## Gate 1: manual release review

### Browser matrix

Use current desktop Chrome/Edge and one mobile browser or responsive device session.

For each canonical route:

- Open through in-app navigation.
- Refresh the deep URL directly.
- Exercise Back and Forward.
- Confirm the route heading, title, canonical URL, and active navigation.
- Confirm no console errors.

Additional checks:

- Open and close mobile navigation and every submenu using pointer, Enter/Space, Tab, Shift+Tab, and Escape.
- Confirm focus moves to the new route heading and remains visible.
- Visit each module route repeatedly and confirm one grid dependency script, one grid instance, and no duplicated column menu.
- Confirm both sheets render expected headers and representative links.
- Confirm every embed loads; if one refuses framing, confirm the direct link is prominent and correct.
- Exercise calculator combinations from `tests/prizing.test.js` and compare displayed totals.
- Test 320-pixel width, 200% zoom, and reduced-motion mode.

### Business-rule signoff

Create `docs/development/decisions/prizing-rules.md` after confirmation. Record:

- Who/what defines the rules and the confirmation date.
- Springfield five-dollar fund exemption.
- Default 25% fund rounding to whole dollars.
- Springfield ten-dollar fractions versus standard fractions.
- Top 8 and Top 16 guaranteed placement payouts.
- Quarter-dollar rounding and first-place remainder behavior.
- Expected handling when attendance is smaller than the selected cut.

If any rule differs, change the pure function and tests together in a focused commit.

## Gate 2: Phase 5b static route discovery

### Recommended architecture

1. Add a Node generator that reads `scripts/site-config.js` and a single HTML shell template.
2. Emit a clean publish directory containing:
   - Root `index.html`.
   - A static HTML entry for every canonical section/tool route.
   - Route-specific title, description, canonical, Open Graph, and structured data.
   - Copied scripts, styles, content, robots policy, sitemap, CNAME, and 404 fallback.
3. Add tests that compare generated route entries with site configuration and sitemap paths.
4. Deploy the generated directory with the official GitHub Pages Actions flow.
5. Verify each sitemap URL returns HTTP 200 before JavaScript and contains its own metadata.

### Constraints

- Do not duplicate hand-maintained page shells.
- Do not introduce a framework; a small deterministic generator is sufficient.
- Keep clean URLs and preserve legacy aliases.
- Keep local preview capable of serving generated route entries.
- Document the changed deployment/rollback process before enabling it on `main`.

### Acceptance criteria

- Every sitemap URL returns an initial 200 response.
- Disabling JavaScript still exposes the route title, description, navigation, and a useful fallback.
- Link unfurlers receive route-specific metadata without executing JavaScript.
- Unknown URLs still produce a real 404/noindex response.
- A revert to the previous known-good generated artifact is documented.

## Gate 3: Phase 4 content and design

Follow `phase-4-content-and-design.md`, beginning with content hierarchy and asset rights before CSS refinement. Do not establish visual regression baselines until the new home content and responsive artwork stabilize.

## Gate 4: Phase 6 automation

Follow `phase-6-quality-automation.md`. Prioritize deterministic Playwright route/lifecycle tests and axe checks before adding screenshots or performance gates. Include the static route generator in CI if Gate 2 has landed.

## Gate 5: Phase 7 operations

Follow `phase-7-operational-resilience.md`. Start with the external dependency inventory and schema contracts, then reuse Phase 6 browser utilities for scheduled production health checks.

## Small follow-ups suitable for opportunistic fixes

- Remove a failed grid dependency script element before retrying so repeated CDN failures do not leave dead tags.
- Gracefully return HTTP 400 from the local preview server for malformed percent-encoded paths instead of allowing `decodeURIComponent` to throw.
- Close an open desktop submenu when clicking outside the navigation.
- Add `aria-busy` to feature mount points while module, spreadsheet, or iframe content is loading.
- Decide and document the repository's license posture.

These follow-ups should receive focused tests where practical and must not displace the browser release gate.
