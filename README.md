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
- `vendor/bakugan_toy_archive/`: checksummed public pilot snapshot exported from the separate toy archive project.

## Pages deployment

GitHub Actions validates the main site, checks out the private archive submodule, and builds a public-only artifact. The archive repository's `public/` directory is copied to `/baku/bakugan_card_archive/`; its development tools, imports, and repository history are not published. The workflow requires a `BAKUGAN_ARCHIVE_TOKEN` Actions secret with read-only Contents access to both repositories.

See [AGENTS.md](AGENTS.md) for detailed architecture, safety rules, change recipes, and the definition of done.

The physical toy catalog pilot is available at `/baku/bakugan-archive/`. Source is maintained in the separate local `S:/Bakugan/website_stuff/bakugan_toy_archive` Git repository. Update its public snapshot through that project's `export:site` command, not by editing vendor files. See the [pilot boundary decision](docs/development/decisions/2026-11-21-toy-archive-pilot.md) for release checks and the future remote/submodule migration.
