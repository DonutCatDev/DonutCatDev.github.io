# Copilot instructions for DonutCatDev.github.io

## Project shape
- This repository is a static GitHub Pages site with no build toolchain, no package manager, and no automated test suite.
- The main entry point is [index.html](../index.html): it defines the shared header/footer, the four top-level landing templates (`/`, `/bey`, `/foam`, `/printing`), and the page templates used by the router.
- The SPA logic lives in [scripts/app.js](../scripts/app.js). It uses History API path routing (`window.location.pathname` + `popstate`) to switch between sections and dynamically inject content.
- The router keeps section metadata in `foamSubpages`, `beySubpages`, and `printSubpages`; those objects are the source of truth for dropdowns, card links, and loaded subpages.
- Feature scripts such as [scripts/dmvbx-topcut-grid.js](../scripts/dmvbx-topcut-grid.js) and [scripts/donut-filament-grid.js](../scripts/donut-filament-grid.js) are loaded on demand by `renderEmbeddedContent()` instead of being imported as modules.

## Conventions to follow
- Prefer vanilla JavaScript and native DOM APIs; there is no framework or bundler to optimize around.
- If adding a new section, update the relevant `*Subpages` map in [scripts/app.js](../scripts/app.js), then add matching template content in [index.html](../index.html) when the section needs a landing grid or a custom page shell.
- Keep relative paths like `content/...`, `styles/...`, and `scripts/...` relative to the site root; this is a GitHub Pages static site, not a Node app.
- Styling is centralized in [styles/main.css](../styles/main.css). Preserve the dark-blue palette, bold text shadows, simple card/grid layout, and lightweight animations.
- Data-heavy pages fetch Google Sheets data via the Google Visualization API (`gviz/tq?tqx=out:json`) and then render a table or grid in-place.

## Workflow
- Validate locally with a static server from the repo root, for example: `python -m http.server` and then open `http://localhost:8000`.
- Check the affected route in a browser; examples: `/bey`, `/foam`, `/printing/print-filament-grid`, `/bey/dmvbx-topcut-data`.
- Because there are no tests, the practical verification is: page loads, route renders, and the external Google Sheets data loads without console errors.
- Keep browser-side code resilient to missing elements; several scripts check for `#script-container` before initializing.

## Important references
- [index.html](../index.html): page shell and templates
- [scripts/app.js](../scripts/app.js): router, route registration, dropdown generation, dynamic script loading
- [styles/main.css](../styles/main.css): shared visual system and layout
- [scripts/dmvbx-topcut-grid.js](../scripts/dmvbx-topcut-grid.js): ag-Grid-based table view from Google Sheets
- [scripts/donut-filament-grid.js](../scripts/donut-filament-grid.js): ag-Grid-based table with column controls
