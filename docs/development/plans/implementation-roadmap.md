# Implementation roadmap

## Phase 0: repository foundation

- Add root agent instructions and contributor-facing project documentation.
- Add editor, line-ending, ignore, and package metadata.
- Make Copilot guidance defer to the root instruction source.
- Establish repeatable validation commands and continuous integration.

## Phase 1: reliability and security

- Replace page-specific grid duplication with shared sheet parsing, dependency loading, and grid rendering modules.
- Pin third-party runtime dependencies.
- Render external data safely and accept only HTTP(S) links.
- Add abortable feature lifecycles and deterministic cleanup during navigation.
- Add loading, empty, retry, and error states.

## Phase 2: calculator correctness

- Extract the payout rules into a pure module.
- Keep DOM rendering separate from calculation and validation.
- Add table-driven unit tests for valid, invalid, boundary, and reconciliation cases.
- Document the current business rules alongside the implementation.

## Phase 3: accessibility and navigation

- Add route-specific headings, titles, active navigation state, focus management, and announcements.
- Use an explicit keyboard/touch disclosure pattern for subnavigation.
- Improve iframe names, fallback links, loading behavior, and route errors.
- Support reduced motion and clearer focus states.

## Phase 5: discovery

- Add default and route-specific descriptions and canonical metadata.
- Add Open Graph metadata, structured data, `robots.txt`, and `sitemap.xml`.
- Ensure the 404 handoff is documented and excluded from indexing.

## Deferred phases

Phases 4, 6, and 7 will receive detailed standalone plans after the implementation phases are complete so their assumptions reflect the new architecture.

