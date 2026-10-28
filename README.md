# donutcat.org

The source for DonutCat's nonsense and sometimes useful information emporium: Beyblade resources, foam-adjacent tools, and 3D-printing references.

The production site is a static, framework-free GitHub Pages application served from `https://donutcat.org`.

## Local preview

Serve the repository root through HTTP:

```powershell
npm run preview
```

Then open `http://127.0.0.1:8000`. The preview server reproduces the GitHub Pages 404 handoff for direct SPA routes.

## Validation

Node.js 22 or newer is recommended. The project has no runtime npm dependencies.

```powershell
npm test
npm run lint
```

## Structure

- `index.html` and `404.html`: GitHub Pages entry points.
- `scripts/site-config.js`: routes and page metadata.
- `scripts/app.js`: SPA shell and navigation.
- `scripts/features/`: interactive page adapters.
- `scripts/lib/`: reusable logic.
- `styles/main.css`: shared visual system.
- `tests/`: unit tests using `node:test`.
- `docs/development/`: engineering plans and audits.

See [AGENTS.md](AGENTS.md) for detailed architecture, safety rules, change recipes, and the definition of done.

