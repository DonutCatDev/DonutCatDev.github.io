# Phase 4 plan: content and visual design

## Outcome

Turn the functional resource index into an intentional personal site: visitors should understand what DonutCat offers, find the right tool quickly, and recognize the same visual identity across desktop and mobile without sacrificing loading performance or accessibility.

## Current baseline

- The home route is still primarily a single DonutCat image.
- Section cards now contain a title and description, but all use the same decorative image.
- One 315 by 337 PNG supplies the favicon, header, background, hero, and cards.
- The visual system has a navy/light palette but only partial spacing, typography, surface, and state tokens.
- Google-hosted Roboto is a render dependency.
- Feature layouts are functional but not yet visually unified around a reusable component system.

## Workstream 1: content architecture

1. Write a short home-page introduction that answers:
   - Who maintains the site.
   - What the Bey, Foam, and Printing sections contain.
   - Which resources are original tools versus externally embedded references.
2. Add three section summaries with direct links to the most-used resource in each section.
3. Review every route title and description for consistent voice, capitalization, and terminology.
4. Add concise usage guidance to the two data grids and the prizing calculator.
5. Add a lightweight “data source / last checked” convention to external-data tools without implying that the sheet contents are locally versioned.
6. Decide whether contact or correction-reporting information belongs on the site. If added, use a dedicated public address rather than personal contact data.

### Content acceptance criteria

- A first-time visitor can identify all three subject areas from the home page without opening the navigation.
- Each card description explains the destination rather than repeating its title.
- Tool instructions fit above or immediately adjacent to the relevant control.
- No route depends on unexplained community acronyms in its primary heading or description.

## Workstream 2: asset inventory and responsive imagery

1. Confirm usage rights and attribution requirements for the existing DonutCat artwork.
2. Preserve the original source asset untouched under a clearly named source directory.
3. Produce purpose-specific derivatives:
   - 32 and 48 pixel favicon assets.
   - 180 pixel touch icon.
   - Approximately 400 pixel card image.
   - 1200 by 630 social-sharing image.
   - A larger hero/background treatment that does not upscale the 315-pixel source into visible blur.
4. Use PNG only where transparency or hard-edged artwork benefits from it; evaluate WebP/AVIF for large photographic or textured derivatives.
5. Add explicit dimensions, `srcset`, and `sizes` to content images.
6. Keep decorative repetitions at `alt=""`; give the social/hero representation concise meaningful alternative text where it conveys identity.
7. Record the generation/export process and source attribution in `content/README.md`.

### Asset acceptance criteria

- No displayed raster is enlarged beyond a visibly acceptable source resolution.
- The largest above-the-fold image is responsive and does not cause layout shift.
- Social previews use a purpose-built landscape image rather than the small square source.
- Image ownership and attribution can be understood from repository documentation.

## Workstream 3: design system consolidation

Expand `:root` tokens to cover:

- Font stacks and type scale.
- Content and wide-content maximum widths.
- Spacing steps.
- Border radii and shadows.
- Base, elevated, interactive, and muted surfaces.
- Text, link, focus, success, warning, and error colors.
- Motion durations and easing.

Build or normalize these components:

- Header and responsive navigation.
- Section hero.
- Project/resource card.
- Primary and secondary buttons.
- Status/notice panel.
- Form field and result card.
- Data toolbar and column chooser.
- Embed frame and fallback treatment.
- Footer and attribution block.

Prefer component classes over element-specific selectors so new tools can reuse the system without copying CSS.

### Design acceptance criteria

- Text and interactive states meet WCAG AA contrast.
- All focus indicators remain visible over image, light, and navy surfaces.
- Spacing and heading scale remain coherent at 320 CSS pixels, 200% zoom, tablet widths, and wide desktop widths.
- No horizontal page scrolling occurs at supported narrow widths; data grids may scroll internally when required.
- Reduced-motion mode contains no decorative movement longer than a near-instant state change.

## Workstream 4: typography and font delivery

Evaluate, in order:

1. A modern system font stack requiring no request.
2. A self-hosted, subset WOFF2 font with documented license.
3. Retaining Google Fonts only if its visual benefit is material.

Whichever option wins must avoid invisible text, declare sensible fallbacks, and be included in the later performance budget.

## Workstream 5: interaction refinement

- Make the entire visible card affordance clear without nesting invalid interactive elements.
- Add restrained current-section context and breadcrumbs only on deep routes where they reduce disorientation.
- Preserve user-selected grid column visibility during the current browser session if testing shows it is useful.
- Add a clear “data opens in a new tab” indication to external resource links.
- Review calculator labels with actual tournament organizers and add rule explanations where mistakes are plausible.

## Verification plan

- Keyboard-only pass at desktop and mobile widths.
- Screen-reader landmark and heading review.
- 320, 768, 1280, and 1920 CSS-pixel layout review.
- 200% and 400% browser zoom checks.
- Windows high-contrast/forced-colors review.
- Slow-network review for image and font behavior.
- Before/after Lighthouse sampling, treated as diagnostic until Phase 6 establishes budgets.

## Risks and mitigations

- **Visual polish hides content problems:** approve the page hierarchy and copy before final styling.
- **New imagery bloats the site:** define target display sizes before exporting assets.
- **Personal tone becomes generic:** preserve existing phrases and review copy for DonutCat's voice.
- **Grid styling becomes brittle against ag-Grid:** keep overrides shallow and prefer supported theme parameters.

## Suggested commits

1. `content: clarify home and resource guidance`
2. `assets: add responsive site artwork and attribution`
3. `style: consolidate responsive design system`
4. `style: refine tool and embed presentation`
