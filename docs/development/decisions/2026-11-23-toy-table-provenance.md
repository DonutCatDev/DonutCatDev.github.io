# Toy article captures and transcluded table evidence

The user's browser export at `2026-11-23T03:11:03.316Z` (November 22 in the workstation's local timezone) contains all four pilot articles. The toy repository now retains their page IDs, revision IDs, source timestamps, capture timestamp, and SHA-256 hashes as compact public provenance. Raw wikitext stays under ignored `imports/`.

The export revealed that the pilot availability/base-stat rows are transcluded from eight separate Bakulog templates. Capturing a parent article does not capture those rows, and an old article revision can render newer template content. No variant can be promoted to revision-reviewed from these four article captures alone.

Catalog release `2026-11-23-pilot.3` keeps the existing schema 2 envelope and adds explicit optional `model.tableSourceId` relationships. Models retain their article source; variants and G2 profiles use the declared table source. The validator rejects mismatched table links. Review queues only include variants whose actual table has been captured. Details link both the availability/base-stat source and the captured mold article. The matching loader and dataset are exported together in the checked public snapshot.

All 44 variant IDs, eight model IDs, 26 profile IDs, toy stats, and unverified card compatibility states are preserved. Current coverage is four imported article snapshots, zero table snapshots, zero completed variant reviews, and zero approved photos. Shared Card Archive styling is unchanged.

The updated `tools/browser-capture-sources.js` in the toy repository requests all four articles and eight explicitly selected base tables in one read-only API call, then downloads a separate `bakugan-toy-sources-with-tables-YYYY-MM-DD.json`. It stops on incomplete, duplicate, or invalid results. It does not recursively crawl templates. Import that replacement file alone, review the actual captured rows, and model any further factual dependencies before marking a variant reviewed.

Push completed local commits manually in dependency order: toy repository first, then this site's updated snapshot. The Card Archive is unaffected.
