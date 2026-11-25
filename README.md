# donutcat.org

The source for DonutCat's nonsense and sometimes useful information emporium: Beyblade, foam-blaster, 3D-printing, and Bakugan resources.

The production site is a static, framework-free GitHub Pages application served from `https://donutcat.org`.

## Local preview

Build and serve the assembled public site through HTTP:

```powershell
npm run preview
```

Then open `http://127.0.0.1:8000`. Preview includes both standalone Bakugan archives and reproduces the GitHub Pages 404 handoff for direct SPA routes. It serves `_site/`, so private source files are not exposed. Restart preview after editing source files to rebuild the artifact.

## Validation

Node.js 22 or newer is recommended. The project has no runtime npm dependencies.

```powershell
npm test
npm run lint
```

Optional browser smoke checks use an installed Chromium browser (Edge is detected on this workstation):

```powershell
npm run test:browser
```

Set `BROWSER_PATH` if your browser is installed elsewhere. The runner uses a temporary profile, a loopback server, and ignored `test-results/` screenshots. It covers the main routes and the toy pilot's filters, keyboard details, navigation, failure/retry states, cleanup, and mobile layout; it does not assert that external spreadsheet services are available.

## Structure

- `index.html` and `404.html`: GitHub Pages entry points.
- `scripts/site-config.js`: routes and page metadata.
- `scripts/app.js`: SPA shell and navigation.
- `scripts/features/`: interactive page adapters.
- `scripts/lib/`: reusable logic.
- `styles/main.css`: shared visual system.
- `tests/`: unit tests using `node:test`.
- `docs/development/`: engineering plans and audits.
- `vendor/bakugan_card_archive/`: private submodule used to assemble the public Bakugan Card Archive.
- `vendor/bakugan_toy_archive/`: pinned Toy Archive submodule.

## Pages deployment

GitHub Actions checks out the two archive submodules, validates the main site and builds a public-only artifact. Their `public/` directories are copied to `/baku/bakugan_card_archive/` and `/baku/bakugan-archive/`. Both workflows require the existing `BAKUGAN_ARCHIVE_TOKEN` Actions secret with read-only Contents access to the site and both archives.

See [AGENTS.md](AGENTS.md) for detailed architecture, safety rules, change recipes, and the definition of done.

The physical toy catalog pilot is maintained in the separate Toy Archive repository. Run `git submodule update --init --recursive` after cloning or pulling this site. To release a new toy version, generate its catalog and checksum manifest, validate and commit the toy repository, then advance the site's submodule pin. Push the toy commit before the site commit. [Submodule decision](docs/development/decisions/2026-11-24-toy-submodule.md)
