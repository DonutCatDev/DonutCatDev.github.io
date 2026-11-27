# Bakugan catalog, collection, and deckbuilding expansion

Date: 2026-11-21. Status: exploration draft; proposed names and architecture are not implementation decisions.

Expand the Bakugan resources into connected tools for finding physical Bakugan, managing cards and toys, and building G1 and G2 teams/decks. Each tool should have its own page and appropriate repository boundary while sharing identity, catalog contracts, and account services.

**First release priority, selected by the site owner: a searchable physical Bakugan catalog.** Start with a reviewed catalog pilot and then expand coverage. Rich collection tools, accounts/sharing, and deckbuilding follow. Keep anonymous browsing useful throughout.

**Styling constraint added 2026-11-22:** all related services must match the current Card Archive before considering a redesign. Its styling is a provisional baseline, not the final design choice. Reuse one common stylesheet/component vocabulary across the toy archive, collections, decks, account flows, and shared views; make later visual changes together. See the [suite styling decision](../decisions/2026-11-22-bakugan-suite-styling.md).

## Existing foundation

The inspected main-site checkout and archive submodule were clean. The archive release pin was `50430be`; the separate archive checkout at `S:/Bakugan/website_stuff/bakugan_card_archive` matched it.

- The main site owns `/baku`, global navigation, route metadata, and the sitemap in `scripts/site-config.js` and related files.
- `DonutCatDev/Bakugan_Card_Archive` owns the card importer, browser UI, and public card data. The main build copies only its `public/` directory to `/baku/bakugan_card_archive/`. See the [deployment boundary decision](../decisions/2026-11-05-bakugan-submodule.md).
- The pinned card payload contains 5,516 printing/source records: 2,985 G1 and 2,531 G2. These are not counts of unique gameplay identities. There are 5,272 records with image URLs; image availability is a separate concern from catalog identity.
- Local collections already support quantities, staged bulk additions, owned-only filtering, JSON export, replace/merge preview, and retention of unmatched IDs. The storage key is `bakugan-card-archive.collection.v1`. Merge keeps the greater quantity; importing the same backup twice does not add copies twice.
- Card records contain useful raw gameplay fields, including factions, types, effects, conditions, evolution links, and BakuCores. Those fields do not yet constitute a reviewed legality database.

Local evidence: `vendor/bakugan_card_archive/docs/{collection,data-model}.md`, `public/scripts/lib/collection.js`, `tools/import-mediawiki.mjs`, and `public/data/cards.json`; main-site `scripts/dev/build-pages.js`, `404.html`, and `.github/workflows/pages.yml`.

## Visitor experience and proposed pages

Use `/baku` as the shared hub. These paths are proposals; preserve the existing card archive URL.

| Page | Main task | Account requirement |
| --- | --- | --- |
| `/baku/bakugan_card_archive/` | Search card printings and inspect source details | None |
| `/baku/bakugan-archive/` | Search physical Bakugan and compare confirmed variants | None |
| `/baku/collection/` | View cards and toys, quantities, wants, trade offers, and binders | Local mode first; account for sync |
| `/baku/deckbuilder/` | Build a format-specific team/deck and inspect validation | Local drafts first; account for saved sharing |
| `/baku/shared/` | Read an explicitly published binder, tradelist, or deck | No account for reading |

Example journey: find a toy, inspect its mold and treatment, add an owned or wanted variant, place it in a binder, then use that variant and a supported gameplay profile in a deck. From a deck, show missing cards/toys without changing ownership.

For the first implementation, use real entry directories and query parameters such as `?item=<stable-id>` or `?deck=<id>`. This avoids depending on the main SPA to resolve arbitrary nested child-app URLs. Query values remain untrusted inputs. Add nested routes only with an explicit Pages refresh/handoff design and browser tests.

## Repository and deployment boundaries

Create repositories when their phase begins rather than creating empty repositories for every possible feature. Names below are provisional.

| Repository | Responsibility | When needed |
| --- | --- | --- |
| `donutcatdev.github.io` | Shared hub/navigation/metadata, pinned application releases, assembled static deployment | Existing |
| `Bakugan_Card_Archive` | Card research/imports, printing catalog, images, card search | Existing; retain ownership |
| `Bakugan_Toy_Archive` | Physical-product research/imports, toy identities, images, toy search | First implementation phase |
| `Bakugan_Core` | Shared schemas, identity mappings, pure collection helpers, format definitions/validators, browser storage/service adapters | Extract when the second consumer needs them |
| `Bakugan_Collection` | Collection, binders, have/want workflows, sharing controls | Collection phase |
| `Bakugan_Deckbuilder` | G1/G2 editor, team selection, validation explanations, deck import/export | Deckbuilding phase |
| `Bakugan_Services` | Database migrations, access policies, sync/publication endpoints, privileged jobs and service tests | Account phase |

The toy archive must not be a new feature folder containing all its data pipeline inside the card repository. Reuse small, tested search/image utilities through shared modules; keep toy-specific normalization in the toy repository. Avoid a separate account system or API for each app.

Continue the existing assembled Pages artifact approach: pin each application's source release and copy only approved static output into its assigned directory. Pin shared modules and catalog releases too; do not fetch moving branch heads at runtime. Keep shared module versions in a release manifest/lock so independently developed apps can be tested together. Build-time packaging does not require a frontend framework. New interactive features expose `mount(container)` and return cleanup functions for their requests, listeners, and third-party instances; standalone app entry points can invoke that same lifecycle.

Generalize the current single-archive build into an explicit application manifest when adding the toy app. Include output paths, expected entry files, catalog releases, and shared-contract versions. The main site remains the source of truth for routes; app manifests must not define competing canonical routes. Update preview tooling to serve the assembled artifact: today's preview serves the source tree and does not reproduce the build's copied archive paths.

All browser-delivered files are public even when source repositories are private. Private source checkout credentials remain build-only and read-only. Never put user collections or service secrets into Pages artifacts.

GitHub Pages provides static hosting; durable accounts and shared user data require an external service. Keep server code in the services boundary and preserve static frontend deployment. Separate repositories do not themselves provide a backend. [GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)

## First release: searchable physical Bakugan

### Catalog scope and identity

Start with a proposed 40–80 reviewed variants spanning a small G1 cohort and a small G2 cohort. This is a manageable schema test, not a completeness claim. Include difficult examples before scaling: same name across generations, G1 size/mold differences, different stat variants, G2 Core/Ultra distinctions, special treatments, and toys associated with more than one card/profile.

Keep these concepts distinct:

| Entity | Meaning |
| --- | --- |
| Toy model | The physical design/mold within a generation, with name aliases |
| Toy variant | A confirmed collectible variation: mold/size, attribute/faction, treatment, and documented distinguishing details |
| Product release | Packaging, wave, region, and release evidence; several products can contain the same variant |
| Gameplay profile | The rules-relevant configuration, including linked Character/reference cards and supported stats |
| Owned entry | A user's quantity or, later, a specific individual copy of a variant |

Allocate immutable internal IDs; treat Wiki page/section references and product numbers as provenance/aliases. Renaming a page, changing an image, or correcting a source table must not change an owned variant's identity. Do not generate a cross-product of every model, faction, and treatment: record only evidenced combinations.

Store generation, model, aliases, size/mold edition, attribute/faction, treatment, release references, optional stat variants, gameplay links, and source revisions. Distinguish a printed G-Power variant when documented; preserve unknown stats as unknown. G2 B-Power, damage, and cores belong to a supported gameplay profile and must not be copied blindly from anime infoboxes or assumed from the toy name. Model/profile links may be many-to-many.

The Wiki's physical-game tables and Bakulogs are candidate source material. Evaluate representative source layouts and permitted export options before choosing an importer. The existing card-infobox importer is not a toy importer. Keep a curated override file and report conflicts/unmapped rows for review; preserve source URL, revision/date, evidence, and image attribution. Confirm publication rights for new data/images as part of source onboarding.

### Search and inspection

- Search model names and aliases; filter generation, series, mold/size, attribute/faction, treatment, and confirmed release information. Provide stat filters only where data supports them.
- Group variants under a model, with an option to browse variants directly. Make the active counting unit visible: models and variants are different totals.
- Offer responsive image and detail views, sorting, shareable search/item URLs, source links, and an image-unavailable placeholder.
- Identify incomplete coverage and uncertain fields. Completion percentages later require a named, versioned catalog scope; unknown or rumored releases must not silently inflate the denominator.

The catalog must ship independently of accounts, full toy collection tracking, and the deckbuilder. Reserve stable links/actions for those integrations rather than blocking browsing on them.

### First implementation backlog

1. Record a toy-identity decision with examples of merge/split cases and unknown fields.
2. Choose the pilot cohorts and source acquisition method; create the pilot inventory and provenance checklist.
3. Define and test `toys.v1`, gameplay-profile links, ID aliases, and the catalog release manifest.
4. Implement the toy importer/curation pipeline with audit output and deterministic IDs.
5. Build accessible search, filters, model/variant grouping, details, and URL state in the toy repository.
6. Add the pinned toy app to the site build, preview, `/baku` hub, route metadata, and sitemap.
7. Review every pilot record; exercise missing images, missing fields, empty search, malformed data, and loading/retry behavior.
8. Release only the reviewed scope, then expand by cohort with import audits.

Exit condition: a visitor can reliably identify and directly link to an evidenced toy variant on desktop or mobile without signing in. A second import preserves IDs, and an unsupported combination is never presented as a confirmed release.

## Shared data contracts before richer collections and decks

The card archive's record is a printing/source record. Introduce separate `cardPrintingId`, `gameplayIdentityId`, `toyVariantId`, and `gameplayProfileId` references. Alternate art, language, or foil can affect collecting while counting together for deck limits. Name alone is not a sufficient equivalence key.

Preserve existing `wiki-*` printing IDs as aliases. The importer currently appends infobox occurrence suffixes for multi-record pages; 383 records have numeric occurrence suffixes. Review how reordered source infoboxes affect those identities. Add explicit remappings and import-to-import comparison before shared collections depend on them. Never remap by fuzzy name without review, and never discard unmatched owned entries.

Version catalog schemas, exports, and rule packs independently. Consumers should declare supported versions and retain unresolved references with recovery labels. Services need a minimal validated catalog-ID/release registry; user writes must not create arbitrary canonical entities. Publish coordinated static catalog releases and a compatible service registry before clients can reference new IDs.

## Collection management

### Useful local release

Provide one inventory spanning cards and toys with grid/list views, quantities, owned/wanted/missing filters, bulk edits, and named virtual binders. Show overall totals and scoped set/model progress. Preserve existing card exports and add a versioned suite export; CSV can be a later convenience, with spreadsheet-formula-safe text handling.

An inventory entry owns the quantity. Binder memberships reference it; putting an entry into two binders does not create extra copies. Initially binders are logical groups, with accessible move/reorder controls. Physical copy allocation and fixed pocket/page layouts can follow without changing this meaning. Decide how partial quantities are displayed before supporting partial-entry binder allocation.

Keep owned, wanted, and offered-for-trade quantities separate. Have lists show owned items; trade lists show quantities the owner explicitly offers. Do not assume every duplicate is available. For example, five owned, two offered, and one wanted are three independent values; two binders containing that inventory entry still mean five owned. Offers cannot exceed owned quantity. Reducing ownership must resolve an excess offer explicitly.

Allow wanted entries for unowned catalog items. Add condition/language/finish distinctions for card lots and optional individual-toy notes through a model that can split quantities later. Do not require users to create a separate record for every identical copy at first.

### Existing-data migration

1. Read the existing v1 collection without changing it and offer a downloadable backup.
2. Preview resolved/unresolved mappings and conversion into the new schema. Preserve original IDs and recovery snapshots.
3. Write and verify the new local store transactionally, leaving the old key intact until successful migration is established. Repeating the migration must not duplicate quantities.
4. Make the archive's collection controls use the same storage adapter as the collection app, or explicitly hand them off. Two independently writable inventories would diverge.
5. On account adoption, preview upload/merge choices. Keep the current maximum-quantity backup merge behavior; summing quantities requires an explicit operation. Preserve local drafts when sign-in or upload fails.

Use IndexedDB when binders and structured records outgrow the current small `localStorage` object. Apps under the same origin can share a namespaced store; repository separation does not isolate browser storage. Handle multiple tabs and schema upgrades through the shared adapter. Local availability means locally saved work and browsing after catalogs load; service-worker offline reload support is a separate enhancement.

## Accounts, synchronization, and sharing

Use one identity/service layer for all Bakugan pages. The owner selected **Cloudflare Workers + D1** on 2026-11-26 to minimize cost. The initial sign-in prototype uses Discord OAuth and private server-issued sessions, with Worker-enforced owner authorization and atomic D1 conditional writes. Supabase Auth/Postgres was locally tested as an earlier candidate but is superseded before provisioning. [Provider decision](../decisions/2026-11-26-bakugan-cloudflare-services.md), [Cloudflare storage options](https://developers.cloudflare.com/workers/platform/storage-options/).

Compare operating cost at expected active users, email delivery, recovery/deletion, backups and restoration, exportability, authorization testing, and maintenance effort. Do not promise free operation or commit to a paid service during planning. Start with one reliable sign-in method; decide email versus a community-relevant OAuth provider during the spike.

Required behavior:

- Inventories, notes, binders, and drafts are private by default. Enforce ownership on every backend read/write, including child records. A hidden button or unpredictable ID is not authorization.
- Keep administrative keys and privileged operations server-side. Use bounded input sizes and rate limits. Treat all imported files, user names, titles, notes, URLs, and catalog strings as untrusted; use safe DOM construction and protocol-validated links.
- Use revision-based conditional writes and idempotent mutation IDs. Start with whole-record conflict detection and a user-visible resolution, rather than silent last-write-wins or automatic summing. Preserve deletions so reconnecting clients cannot resurrect records.
- Distinguish saved locally, pending sync, synced, and conflict/error. Account switches must not show the previous user's private cached records. Preserve an export/recovery path during outages.
- Explicitly publish selected fields/items as a read-only snapshot with a revision and update action. Changes in the private binder must not accidentally become public. Later live shares can be a separate mode.
- Support private, unlisted, and public visibility with clear labels. Unlisted means readable by anyone with the link. Revocation removes future server access; downloaded copies cannot be recalled.
- Shared views exclude private notes, email, acquisition details, and unrelated inventory. Provide owner deletion/revocation and abuse reporting before public sharing. Keep contact details optional and explicitly published.
- Offer data export, account deletion, and a documented retention/backup policy. Set the intended audience and privacy/support responsibilities before account launch.

Share links can use an opaque publication ID on `/baku/shared/`; anonymous readers receive only the published projection. Default unlisted shares to `noindex`. Use a single configured backend endpoint and narrowly allowed frontend origins/callbacks. Treat all code hosted at `donutcat.org` as sharing an origin trust boundary.

## G1 and G2 deckbuilding

Build one editor with explicit format profiles and separate rules. Generation is not a format. A profile identifies generation, game/era, region where relevant, permitted zones, eligible cards/toys, duplicate equivalence, and a versioned rules source. Save the profile version with every deck so a later rule update triggers revalidation rather than silently changing its meaning.

The first G1 candidate is a named standard Gate/Ability format; G2 is a named TCG format. The owner's preferred eras, community formats, and rule revisions still need selection. Keep HSP, Big Game, later support pieces, and regional/community variants as explicit additions.

The official New Vestroia rulebook provides a concrete G1 baseline: three Bakugan, three Gate cards with one per color, and three Ability cards with one per color. It separately describes Big Game and Trap rules, demonstrating why those belong in profiles. This is one sourced baseline, not a declaration covering every G1 format. [New Vestroia rulebook, official document mirrored by the Wiki](https://bakugan-wiki.nyc3.cdn.digitaloceanspaces.com/3/34/New_Vestroia_rulebook.pdf)

For a G2 baseline, the official glossary specifies three toys with Character cards, six matching BakuCores, and a 40-card deck. Its copy-limit definition uses name and function: same-name/same-ability printings count together. Confirm later revisions and special mechanics before labeling a profile tournament-ready. [Official Bakugan glossary, deck construction](https://intl2.bakugan.com/sites/bakugan/files/2020-01/Glossary.pdf)

### First editor and validation

Support team/profile selection, card search/add/remove, clear zones, quantity editing, autosaved local drafts, import/export, and a validation panel. A sandbox deck may be saved with errors. Selecting a different format previews incompatible items rather than deleting them.

| Check | Planned behavior |
| --- | --- |
| Card and team counts | Enforce the selected profile's exact totals and zone sizes |
| Duplicate limits | Aggregate reviewed gameplay identities across printings/languages |
| Card roles and types | Check allowed zones, era/pool, restrictions, and profile-specific support pieces |
| Attributes/factions/colors | Use the profile's rules and structured team data; do not apply G2 faction eligibility globally to G1 |
| Toy/card relationships | Verify supported Character/reference/profile relationships and required cores/equipment |
| Ownership | Show missing quantities as collection information; ownership does not determine deck legality |

Return a rule ID, severity, explanation, affected entries, and source reference from pure validators. Distinguish errors, advisory warnings, and unknown/unverified checks. Missing metadata must not produce a green legal result. Published decks requiring a legality label must be validated by the backend using the declared rules/catalog versions; browser results alone are editable by the client.

### Advanced alerts after reliable basics

Add reviewed, structured requirements and tags gradually: evolution targets, named Bakugan, equipment compatibility, activation thresholds, faction/core prerequisites, and keyword enablers/payoffs. Begin with a limited audited subset. Natural-language rules text can suggest curation work but should not become authoritative through automatic parsing alone.

Separate an impossible deck requirement from a requirement dependent on the opponent or a future game state. For example, a missing required base profile can warrant an alert; an activation threshold that may be met during play needs an explanation rather than a blanket construction error. Synergy and energy-curve suggestions remain advisory. Let users inspect why each warning appears and hide optional advice without hiding legality failures.

## Phased delivery and release gates

| Phase | Deliverable | Gate before proceeding |
| --- | --- | --- |
| 1: toy catalog pilot | Toy repo, reviewed identities/data/images, search/details, main-site integration | Pilot reviewed; stable IDs on reimport; direct links, mobile and keyboard flows work |
| 2: coverage and local collections | Expand toys by cohort; shared core as needed; collection app, binders, have/want/trade quantities | v1 migration/recovery verified; no double counting; card and toy apps use one inventory |
| 3: accounts and sharing | Services repo, sign-in, sync, explicit publications | Two-user isolation tests, conflict/retry tests, revocation, export/deletion, and backup restore pass |
| 4: G1/G2 deckbuilding | Deckbuilder repo, named rule packs, local editing and account saves | Both profiles have sourced fixture decks; duplicates, zones, factions, and unknown cases tested |
| 5: advanced help | Audited requirements, synergy advice, more formats, optional richer binder layouts | Each supported check has provenance/tests and clearly limited coverage |

Format research and a pure validator prototype can proceed after toy identity contracts stabilize; account services are not required for a local deck editor. Detailed estimates should follow the pilot data audit and backend spike. The largest unknown is toy-source normalization and coverage, followed by rule/profile curation and safe synchronization.

For every phase, retain loading, empty, malformed, missing-image, network-error, and retry states. Test catalog integrity, ID migration, unsupported versions, malicious imports/URLs, and cleanup. Test direct entry/refresh, query preservation, Back/Forward, aliases, metadata, and repeated navigation across both the main SPA and standalone apps. Give each changed interface keyboard, touch, screen-reader, narrow-screen, zoom, high-contrast, and reduced-motion review; binder reordering must work without dragging.

Run each affected repository's tests/lint and the main site's `npm test` and `npm run lint`; validate the assembled output excludes private sources and user data. Pin exact runtime dependencies. Require backend authorization tests against at least two owners and anonymous share readers before account publication.

## Decisions for the next planning pass

1. Which toy cohorts should lead the public catalog? Proposed default: a G1 cohort exercising size/stat differences and a G2 Battle Planet Core/Ultra cohort, with 40–80 total reviewed variants.
2. How granular should collecting be initially: confirmed variant quantities, or individually annotated toy copies? Proposed default: variant quantities with a later copy-level extension.
3. Which named G1/G2 rules and community restrictions should the first editor support? Proposed baseline sources are above; broader format coverage is separate work.
4. What operating budget and account sign-in method are acceptable? Evaluate the two backend candidates before choosing one.
5. Should initial sharing be manually published snapshots or automatically updated lists? Proposed default: explicit snapshots with update/revoke controls.

Phase 1 now has a pinned toy submodule, 979 variants across 116 season-specific models reviewed against captured table revisions, 341 reviewed G2 card/core mappings, and 365 searchable product releases. The completed 102-page bulk capture adds 274 reviewed physical variants across 57 models, 237 exact card/core mappings and 118 independently reviewed products. The follow-up adds 29 exceptional-row/treatment variants, 12 exact mappings and 85 grouped products; 420 of 421 G2 variants have matched packages. The completed early G1 capture adds 538 variants from 39 verified B1/B2 table identities, including 125 physical distinctions and 30 recorded attribute wheels. The combined catalog has 558 G1 and 421 G2 variants. G1 exact package-to-power allocation, uncertain rows, and later series remain separate work. The main-site build validates the public release manifest and copies only the archive's public directory. Identification photos and broader coverage remain pending. [Submodule decision](../decisions/2026-11-24-toy-submodule.md)

Phase 2 has a local-first Collection Manager sibling repository and route, shared v2 inventory contract, explicit legacy card migration preview and original backup, card ownership projection adapter, direct toy variant handoff, independent have/want/trade quantities, logical binders and local suite/list exports. All three pages share the pinned Card Archive stylesheet. [Shared local inventory decision](../decisions/2026-11-24-shared-local-inventory.md). Release `2026-11-25-local.2` adds scoped selection across pages, atomic bulk quantity and binder edits with preview, binder covers and an ordered visual gallery. The v2 storage format remains unchanged. Account services, hosted sharing, physical-copy/pocket allocation and deckbuilding remain future phases.

Phase 3 began with a separate `Bakugan_Services` repository and a locally verified Supabase/PostgreSQL migration; the owner then selected Cloudflare Workers + D1 to minimize cost. The active Worker/D1 backend preserves the private v2 contract, conditional revisions, idempotent latest-mutation retries, explicit preview/create/list/revoke, and anonymous snapshot reads. Discord OAuth is the initial provider prototype. The Worker and schema pass SQLite authorization/validation, conflict/retry, revocation, quota and account cleanup tests and a real local workerd/D1 smoke test including a multi-megabyte inventory. [Cloudflare service decision](../decisions/2026-11-26-bakugan-cloudflare-services.md). Collection release `2026-11-26-account.1` implements the isolated account workspace, explicit guest adoption and sync/conflict handling, unlisted publication management, and `/baku/shared/` anonymous reader. Repeated request receipts and account switches are verified in synthetic browser checks; the Worker requires the expected account assertion for every private request. The endpoint remains disabled in the checked-in configuration pending hosted staging, actual OAuth/cookie checks, public-launch operations and later cross-archive account integration. [Account workspace decision](../decisions/2026-11-26-bakugan-account-workspace.md).

Phase 4 has begun independently of account provisioning with `Bakugan_Deckbuilder` release `2026-11-27-deck.1` at `/baku/deckbuilder/`. Versioned New Vestroia basic and Battle Planet TCG profiles provide local draft management, exact toy/Character matching, card/frame/quantity/faction checks, core-symbol matching, provisional copy equivalence, advisory Evo/ability conditions, Gate boost/energy analytics and guest ownership comparisons. Saved/imported drafts retain incompatible entries on format switch. The validator is tested against actual pinned archive fixtures and synthetic cases, with mobile browser workflows. Account-backed decks, public sharing, broader format pools and curated advanced synergy checks remain pending. [Deckbuilder pilot decision](../decisions/2026-11-27-bakugan-deckbuilder-pilot.md).

Release `2026-11-27-deck.2` adds New Vestroia Big Game and a limited Battle Planet + Armored Alliance single-faction TCG profile, including Baku-Gear, with the same local draft and collection model. A G2 role breakdown complements the energy curve. Optional G1 support pieces, Fusion/dual-faction mechanics, later G2 formats, and curated activation requirements still require further data and rules work. [Format expansion decision](../decisions/2026-11-27-bakugan-deckbuilder-format-expansion.md).

Owner testing revealed missing G2 toys. A 197-title capture and subsequent source review expanded the Toy Archive (`2026-11-27-pilot.15`) to 1,206 variants, including 119 GR and 108 EV additions, with 550 G2 exact Character-linked physical variants. Warrior Whale and Serpillious now have nine and six physical versions respectively; Tretorous has ten across AA/EV, including two newly paired AA translucent versions. Deckbuilder release `2026-11-27-deck.4` offers all-season single-faction construction and distinguishes format exclusions from genuine missing physical records. Legends wave-product evidence, Fusion and other support pieces still need review; the next 125-title capture targets the actual discovered missing transclusions and Legends package mixes. [Coverage audit](../decisions/2026-11-27-g2-toy-coverage-audit.md).

The initial schema 2 follow-up added browser/XML source intake, hash-bound variant reviews, and reviewed identification-photo mappings. It recorded an indexed Delta Dragonoid revision separately from imported snapshots; all 44 variants awaited revision review and approved photos at that stage. See the [source-review decision](../decisions/2026-11-22-toy-source-review.md).

The user's first browser export supplied all four article revisions. Their availability/base-stat rows are transcluded from eight separate Bakulog templates, so the updated helper captures those tables too. Models retain article provenance while variant/profile evidence binds to explicit table sources. See the [table-provenance decision](../decisions/2026-11-23-toy-table-provenance.md).

The second export includes all twelve sources. All 44 pilot variants were reviewed against the captured table rows with no stat or ID changes. The records identify Codex as the source reviewer and bind to exact revision/content/fact hashes; this is not a physical inspection or owner attestation. See the [pilot review decision](../decisions/2026-11-23-toy-pilot-review.md).

The schema 3 follow-up added exact Character Card printing links and both paired cores for all 26 G2 profiles. It also corrected the Card Archive importer and 405 matching-revision records that had lost repeated core icons. The main build validates toy/card catalog pins and selected records together. The catalog keeps the shared Card Archive theme and noindex pilot status. [Card/core mapping decision](../decisions/2026-11-23-toy-card-core-links.md)

Release `2026-11-23-pilot.6` adds 48 searchable product releases and 52 source-backed associations across 28 pilot variants. Four packages contain two cataloged variants each. The G1 links use rows with a single printed G-Power. G2 links use exact reviewed base rows from the captured tables. The toy repository's `docs/pilot-photo-review.md` tracks five photo candidates and their identification and reuse evidence gaps.

## Research and verification notes

Architecture and current-feature observations come from the pinned local source. Hosting, service capabilities, and baseline rules were checked against the linked primary documentation on 2026-11-21. Wiki toy pages are source-discovery candidates requiring the pilot audit, not a verified complete physical catalog. The live donutcat.org pages were unavailable through the web tool, so this draft does not claim a production browser review. Command/check outcomes for this documentation change are reported in the task handoff.
