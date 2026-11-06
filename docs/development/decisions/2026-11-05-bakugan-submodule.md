# Bakugan archive deployment boundary

The Bakugan Card Archive is maintained in the private `DonutCatDev/Bakugan_Card_Archive` repository and included in this repository as the `vendor/bakugan_card_archive` submodule.

The main site owns the `/baku` landing route, global navigation, metadata, and sitemap. During the Pages Actions build, only the archive repository's `public/` directory is copied into the deployment artifact at `baku/bakugan_card_archive/`. This keeps import exports, development tools, tests, and repository history out of the public site while preserving a fully static deployment.

The submodule commit is an explicit release pin. Updating the private repository does not change production until the submodule reference in this repository is advanced and the main site is deployed again.

The Actions credential must be limited to read-only repository Contents access. The generated HTML, CSS, JavaScript, and card JSON are public by design even though their source repository is private.
