# Remaining implementation phases

This index covers the work intentionally deferred after phases 0, 1, 2, 3, and 5 were implemented on 2026-10-27.

## Recommended order

1. **Phase 4: content and visual design.** Establish the final content hierarchy and asset strategy before measuring or automating visual and performance budgets.
2. **Phase 6: quality automation.** Add browser, accessibility, markup, link, and performance coverage against the improved presentation.
3. **Phase 7: operational resilience.** Add scheduled external-service and production checks after the expected page behavior and budgets are encoded.

Phase 6 can begin in parallel with late Phase 4 work, but its screenshot and performance baselines should not be finalized until the Phase 4 layout and images stabilize. Phase 7 should reuse Phase 6's browser and link-checking utilities rather than create a separate monitoring stack.

## Cross-phase constraints

- Keep GitHub Pages and `donutcat.org` unless a documented hosting requirement cannot be met there.
- Do not add a client framework solely for presentation work.
- Keep route definitions in `scripts/site-config.js` and keep `sitemap.xml` synchronized through tests.
- Keep external spreadsheet data out of the repository.
- Any analytics must be justified by a concrete question, collect the minimum necessary data, and be documented for visitors.
- New runtime dependencies must be pinned, reviewed, and covered by failure behavior.

## Completion sequence

Each phase should land as one or more focused commits, update its plan with completion notes, and be followed by:

```text
npm test
npm run lint
```

When browser automation exists, its smoke and accessibility commands become part of the required sequence as well.
