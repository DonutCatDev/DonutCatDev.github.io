# Isolated Cloudflare staging release

The owner-selected Workers and D1 backend is ready for hosted acceptance testing. Keep production GitHub Pages at `donutcat.org` and the pinned Collection Manager API config disabled. Do not point production at a staging database or modify apex DNS.

## Staging targets

| Component | Target |
| --- | --- |
| Cloudflare Pages Direct Upload project | `bakugan-suite-staging` |
| Frontend custom hostname | `https://baku-stage.donutcat.org` |
| Worker and D1 database | `bakugan-services-staging` |
| API custom hostname | `https://baku-api-stage.donutcat.org` |

Both HTTPS hostnames are same-site, while sessions and browser-local storage remain separate from production. The Worker accepts only the designated frontend Origin and requires the staging tester allowlist for sign-in and existing sessions. Missing or malformed tester configuration disables access. The database is disposable and uses the existing two migrations; never copy real user inventory into it.

Run `npm run build:staging` from the main repository. The separate `_site-staging/` artifact is generated from validated submodule releases before overlaying the staging-only API origin. It has a warning banner, crawler headers, a no-store configuration response, no production CNAME, and no production sitemap. It is ignored by Git. The production build rejects a staging API origin and continues to use `_site/` and the existing GitHub Pages workflow. Cloudflare Pages Free asset limits are checked during assembly ([Pages limits](https://developers.cloudflare.com/pages/platform/limits/)).

The Services repository contains the isolated Worker configuration template, local config generator/checker, and anonymous hosted probe. See its `docs/staging.md` for the owner setup and real browser acceptance checklist. Provisioning requires the owner's Cloudflare account, a new D1 identifier, a Discord application and secrets. No remote resources are created, uploaded, or deployed by this change.

## Before production activation

Verify the hosted HTTPS and Discord OAuth flows with two authorized test identities, separate account data, sync conflicts/receipt retries, archive edits and deck ownership, anonymous shares/revocation, and actual Free-plan capacity. Keep test data synthetic; record only aggregate metrics and release/test results. Confirm privacy, export/deletion, recovery, cost controls and rollout/rollback before enabling public sign-up.
