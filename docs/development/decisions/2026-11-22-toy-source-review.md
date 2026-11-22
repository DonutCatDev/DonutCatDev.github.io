# Toy revision evidence and identification photos

The toy catalog's schema 2 release adds separate states for indexed revision references, captured revision snapshots, and reviewed variant facts. A source capture alone cannot promote variants to reviewed status. Completed reviews must match the source ID, revision, source-content SHA-256, and a fingerprint of the current catalog facts. A source/fact correction invalidates the old review. Card compatibility remains a separate unverified relationship.

The toy source repository now accepts permitted browser API captures and current-revision MediaWiki XML exports. Its importer writes candidate metadata and a pending review queue only under ignored `imports/`; raw source content is not copied into public output. Its browser helper makes one read-only request for the four pilot pages in a normal session after any manual verification. It does not bypass site challenges or export credentials.

Identification photos require an explicit variant mapping, public credit, source URL, documented reuse basis/evidence URL, an open/closed view, and intrinsic dimensions. The build rejects unreviewed/invalid mappings. Runtime source/rights links use validated URLs and safe DOM construction. Mold tiles label a matching variant photo as an example; failed images retain a readable fallback and attribution.

Schema 2 preserves all 44 variant IDs, eight model IDs, 26 unverified profiles, and existing toy stats. The main site deploys its matching loader and data together via the checksummed snapshot. The shared Card Archive styling is unchanged.

Direct Wiki reads remained blocked during this work. An indexed Delta Dragonoid footer yielded revision `858181`, recorded only as an observation; an identified photo had an author credit but no clear reuse terms, so it was not attached. This release contains zero imported source snapshots, zero completed variant reviews, and zero approved photos. It supplies the intake/review path and displays those limitations accurately. Source instructions and contracts live in the toy repository's `docs/source-review-workflow.md` and `docs/catalog-v2.md`.
