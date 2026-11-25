# Pin both archives as Git submodules

The Toy Archive's previously pushed `ed9d024` commit was verified on its GitHub main branch on November 24. The site now tracks the separate Toy Archive repository as a Git submodule, matching the Card Archive boundary. It continues to build only each archive's public directory at its existing route.

The toy project's catalog build generates its root `release.json` public-file checksum manifest. Its own lint validates generation and hashes, and the site checks that manifest, catalog schema, and exact linked card records before assembling the artifact. The old snapshot copy command is retired. Existing archive URLs and shared styling are preserved.

Both GitHub Actions workflows initialize the archive submodules using the existing `BAKUGAN_ARCHIVE_TOKEN`. That secret needs read-only Contents access to all three repositories. Fork pull requests may lack access to this secret.

Pilot release `2026-11-24-pilot.7` also adds two Clear Delta Dragonoid B1 variants and Darkus/Aurelus Hydorous Ultra. The latter have two verified source/card/core matches and two named packages. The catalog now has 48 reviewed variants, 28 linked G2 profiles, and 50 named packages. All previous variant IDs and stats are preserved.

The owner pushes the Toy Archive commit before the main site commit. The site pin must refer to a commit available from the toy remote when CI runs.
