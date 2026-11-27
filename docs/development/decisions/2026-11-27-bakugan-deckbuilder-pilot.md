# G1/G2 Bakugan Deckbuilder pilot

Date: 2026-11-27. Status: locally verified, static release `2026-11-27-deck.1`.

The new sibling `S:/Bakugan/website_stuff/bakugan_deckbuilder` is pinned as `vendor/bakugan_deckbuilder` (commit `7df0bc0`). The site assembles its checksum-verified `public/` at `/baku/deckbuilder/`; the route is noindex and uses the same pinned Card Archive stylesheet as the other apps. Proposed remote: `https://github.com/DonutCatDev/Bakugan_Deckbuilder.git`. The owner must create/access and push that repository before the site pin. The checkout token needs read access if the source repository is private. No remote was created or pushed.

## Format profiles

- `g1-nv-basic-v1`: 2008 [New Vestroia rules sheet](https://bakugan-wiki.nyc3.cdn.digitaloceanspaces.com/3/34/New_Vestroia_rulebook.pdf), normal two-player setup. Three physical Bakugan, one Gold/Silver/Copper Gate each, one Red/Blue/Green Ability each. Frame color is distinct from toy attribute; no invented universal G1 color-to-team restriction. Later/regional colored G1 card records are advisory scope checks, not an asserted formal ban. Traps, Big Game, HSP and other support-piece formats need separate profiles.
- `g2-bp-tcg-v1`: [official January 2020 Glossary](https://intl2.bakugan.com/sites/bakugan/files/2020-01/Glossary.pdf), setup, deck construction, Character/core and Evo sections. Three paired Bakugan/Character cards, six matching core symbols, exactly forty main-deck Action/Hero/Flip/Evo cards, matching at least one confirmed team faction, and three-copy limits. Battle Planet is a pilot pool boundary, not an official rotation; later support types are intentionally outside the profile.

The editor reads the existing 5,516 card records and 979 toy variants. At the current pin, 217 Battle Planet variants have a reviewed, exact Character choice whose stats, faction, paired core indicators and source revision agree with the pinned Character record. Unknown treatment mappings remain unknown; no compatibility is inferred solely from mold name. Core matching counts repeated icons independently. Duplicate checking enforces per-printing maximum and provisional same-name/function metadata groups, with review warnings for different or uncertain versions; this is not a curated tournament copy-equivalence database. G2 Evo base alerts are advisory, G1 ability condition text is displayed rather than automatically interpreted, and G1 Gate boosts/G2 energy distribution are reference analytics. Missing metadata prevents an unqualified checked result. See the dependency's `docs/formats.md` for precise limitations.

## Drafts and ownership

Standalone local library key `bakugan-suite.decks.v1` stores multiple named drafts, explicit versioned profile IDs, exact stable card/toy/profile identities and fallback names. The user may keep invalid decks. Format switch preview retains incompatible contents. Web Locks and prior serialized storage comparison prevent stale writes; imports create independent draft copies, and unreadable bytes are preserved for recovery. JSON library/single-deck exports and missing-item text downloads stay local.

The editor reads the existing shared **guest** collection via its canonical inventory module. Exact variant/printing needs (including Character cards and repeated toys) are compared without altering quantities; ownership is not a legality check. Account deck sync, public deck publication, physical core inventory, wider formats, curated gameplay identities and advanced activation/synergy rules are subsequent work. Online collection staging remains unconfigured; local deckbuilding is independent.

Verification: standalone validator/storage tests, real pinned archive fixture tests for complete 3/3/3 and 40-card construction, and Chromium workflows for both profiles, core multiset, quantity/faction errors, explicit import, format preservation, refresh, guest inventory unchanged and 320px layout. No live deployment was performed.
