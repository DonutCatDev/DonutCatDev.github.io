# Phase 7 plan: operational resilience

## Outcome

Detect failures in the deployed site and its external data sources, make ownership and recovery procedures explicit, and reduce the chance that a domain, CDN, spreadsheet, or Apps Script change silently breaks a public tool.

## Dependency inventory

Create `docs/development/operations/external-dependencies.md` with one row per dependency:

- Public route using it.
- Service type: Google Sheet, published sheet, Apps Script, Google Fonts, jsDelivr, GitHub Pages, DNS/custom domain.
- Public URL or non-secret identifier.
- Expected response and minimum schema.
- Owner or maintaining account, recorded without credentials.
- Required sharing/publishing state.
- Failure shown to visitors.
- Recovery or replacement procedure.
- Last manually verified date.

The current inventory must include both data-grid sheets, all five Foam embeds, ag-Grid 36.2.0, Google Fonts if retained after Phase 4, GitHub Pages, and the `donutcat.org` DNS/HTTPS configuration.

## Workstream 1: production health checks

Run a scheduled GitHub Actions workflow that checks:

- `https://donutcat.org/` returns HTTPS successfully.
- Canonical section and tool URLs reach the SPA and render expected headings in a browser.
- `robots.txt`, `sitemap.xml`, CSS, JavaScript modules, and the primary image are available.
- The TLS certificate is valid beyond a defined warning window.
- The custom domain resolves to the expected GitHub Pages configuration.
- No unexpected redirect crosses to another origin.

Use retry with bounded backoff and require repeated failures before opening or escalating an issue. A single transient network failure should not create alert fatigue.

## Workstream 2: external data contract checks

For each Google Visualization sheet:

1. Fetch the public endpoint.
2. Confirm a successful response and parse it with the same production parser.
3. Verify required headers while allowing additive columns.
4. Confirm at least a plausible minimum row count when an empty sheet would indicate lost publishing access.
5. Never log complete row contents; report only schema and counts.

For each iframe/App Script dependency:

- Check successful reachability and final origin.
- Record whether framing is still allowed where automation can observe it.
- Avoid submitting forms or mutating external data.

## Workstream 3: incidents and recovery

Create a concise runbook covering:

- GitHub Pages deployment failure.
- Custom-domain or certificate failure.
- Google Sheet access revoked or schema changed.
- Apps Script deployment replaced or disabled.
- jsDelivr/ag-Grid outage or incompatible upgrade.
- Broken route or 404 redirect loop.
- Incorrect calculator result report.

Each scenario should state how to confirm the problem, the safest temporary visitor-facing fallback, the permanent repair, and how to verify recovery.

For calculator incidents, preserve the current code and inputs needed to reproduce the report before changing formulas. Add a regression test for every confirmed error.

## Workstream 4: dependency and upgrade policy

- Review pinned ag-Grid updates quarterly or when a security advisory applies.
- Test updates in a dedicated pull request with grid smoke tests and real-sheet integration checks.
- Keep a known-good version documented for immediate rollback.
- Review GitHub Actions major versions and Node LTS annually.
- Remove unused external origins promptly.
- Do not add an external status/analytics service unless its operational benefit exceeds the new dependency and privacy cost.

## Workstream 5: domain and deployment governance

- Document where DNS is managed, without storing account secrets.
- Confirm GitHub Pages “Enforce HTTPS” remains enabled after DNS changes.
- Document the expected `CNAME` contents and apex/`www` redirect policy.
- Protect `main` with required quality checks if repository settings permit.
- Keep deployment behavior simple: a reviewed push to `main` publishes the static repository.
- Add a rollback procedure based on reverting the offending commit, not rewriting published history.

## Workstream 6: privacy and observability decision

Before adding analytics, write down the question it would answer. Preferred signals are aggregate and operational, such as route availability and external-service failures.

If visitor analytics are justified:

- Choose a privacy-respecting service with minimal cookies and retention.
- Document collected fields and purpose.
- Avoid collecting calculator inputs, spreadsheet cell data, full referrers, or personally identifying information.
- Provide a visitor-facing privacy note.

If no concrete product question exists, explicitly record the decision to remain analytics-free and rely on synthetic health checks.

## Acceptance criteria

- Every runtime external dependency has an owner, expected contract, and recovery path.
- Scheduled checks distinguish site regressions from third-party outages.
- Repeated production failures create an actionable notification without exposing external data.
- Domain, certificate, canonical route, and external-schema checks run at least weekly.
- The runbook enables recovery without relying on undocumented memory.
- A rollback can be performed through an ordinary revert commit.
- Privacy posture is documented whether analytics are adopted or rejected.

## Risks and mitigations

- **Monitoring becomes another fragile dependency:** use GitHub Actions and existing browser tooling first.
- **Checks leak sheet contents:** log only availability, headers, counts, and sanitized errors.
- **Transient outages create noise:** retry and require consecutive failure evidence.
- **Runbooks decay:** review them after each incident and during the quarterly dependency review.

## Suggested commits

1. `docs: inventory external services and recovery ownership`
2. `test: add production and spreadsheet contract checks`
3. `ci: schedule site health monitoring`
4. `docs: add deployment domain and incident runbook`
5. `docs: record privacy and observability policy`
