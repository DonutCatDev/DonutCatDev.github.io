# Consistent styling across the Bakugan services

The site owner requires the Card Archive, Toy Archive, collection tools, deckbuilder, and related shared views to match stylistically before pursuing a redesign. The current Card Archive is the provisional baseline. This does not mean its design is final or approved as the long-term direction.

## Baseline and implementation

Use the Card Archive's existing dark background, navy panels, light text, cyan/gold accents, typography, header/brand, hero, controls, result tiles, and dialogs. Match common components and interaction states across services while allowing layouts to suit their tasks.

The main-site build copies the pinned Card Archive stylesheet unchanged to `/styles/bakugan-archive.css`. The Card Archive keeps loading its own original stylesheet; related apps load the emitted copy of those same bytes. This establishes a single source without editing the card submodule or creating a second manually maintained theme. The stylesheet is public output, not another repository or external runtime dependency.

The Toy Archive now loads that baseline and reuses its component classes. Its local stylesheet contains toy-specific layout adapters and uses the baseline's tokens. It no longer defines a separate light theme, palette, typography, button design, or dialog design. Preview through the assembled main-site build so the shared stylesheet is available.

Future collection, deckbuilding, account, and shared-view pages must use this baseline too. Their repositories can remain separate; repository boundaries must not create separate visual identities. App-specific CSS may arrange content, but should not override shared theme tokens or invent new variants of common components.

## Future design changes

First bring each related service into parity. Then evaluate design alternatives as a suite, including shared navigation, browsing, collection editing, deck validation, dialogs, and mobile states. Apply an agreed redesign through the common source and verify every service together. Keep source ownership/versioning explicit if the common theme is later extracted into a shared package; do not fork its implementation into each app.

The build verifies the Card Archive stylesheet exists before replacing output. Browser smoke checks compare the emitted stylesheet with the original and compare computed body, heading, brand, search, primary-button, and dialog styles across the card and toy pages. Continue keyboard, narrow-screen, reduced-motion, and forced-color checks when changing common styling.
