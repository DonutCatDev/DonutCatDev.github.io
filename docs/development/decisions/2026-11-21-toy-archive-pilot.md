# Physical Bakugan pilot and distribution boundary

The first implementation of the expansion prioritizes the physical catalog. Its source lives in the separate local repository `S:/Bakugan/website_stuff/bakugan_toy_archive`; the card archive's source and collection format remain untouched.

The pilot has 44 source-transcribed variants across eight physical molds. Model, collectible variant, and gameplay profile have separate immutable IDs. G1 printed G-Power differences distinguish variants. G2 source-listed B-Power/damage live in unverified profiles, not as assumptions about card compatibility. Unknown fields remain null. Source revision evidence, photographs, product-release normalization, and final data review remain pending.

The toy repository began without a configured remote. To keep clean main-site checkouts buildable, `vendor/bakugan_toy_archive/public/` is a distribution snapshot, not a second source checkout. The toy repository's export command writes `release.json` with public-file SHA-256 hashes and a catalog release identifier. Main-site tests/builds verify these hashes and exclude the release metadata and development files from deployed output. Do not edit the snapshot by hand; change the sibling project, validate, and export it.

The local repository now has `origin` configured for `DonutCatDev/Bakugan_Toy_Archive`. Keep the snapshot until the initial source commit is manually pushed and a remote release is verified; conversion to a pinned submodule or immutable artifact is a separate change. Do not use a local-only Git submodule URL or a dependency on an unpublished commit: either would break CI.

`scripts/dev/static-apps.js` declares static app source contracts and derives destination routes from `scripts/site-config.js`. The main build validates all apps before replacing `_site`. Preview now serves that assembled output, including both archives, with the same root SPA 404 handoff.

The toy catalog is at `/baku/bakugan-archive/`, with query-based filters and variant details. It is a visible pilot linked from the hub/navigation, marked `noindex,follow`, and excluded from the sitemap until its coverage/review is ready for indexing. The static-app fallback link is now resource-specific rather than hardcoded to the card archive.

This work does not create accounts, migrate collections, provision services, configure remote repositories, or publish the site.

## Verification

The sibling toy project passed seven Node tests and its syntax/catalog lint. The main site passed 45 Node tests, including snapshot integrity, route coverage, and HTTP preview boundaries, plus its project lint and Pages build. A dependency-free headless Chromium runner exercises the required main routes and 19 browser checks covering pilot filters, direct links, keyboard details/focus return, Back/Forward, malformed/empty/network responses and retry, three mount/cleanup cycles, 320-pixel layout, reduced motion, and forced-color media. Desktop/mobile screenshots are ignored local outputs in `test-results/`.

Node 24 is available through the workstation's editor fallback, so the checks can run even though `node`/`npm` are absent from PATH. The browser runner needs loopback browser-debugging access outside this environment's sandbox. No external spreadsheet availability or real screen-reader session is certified by these checks.
