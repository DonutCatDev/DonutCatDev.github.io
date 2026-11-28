# Private deck libraries and unlisted sharing

## Decision

Extend the existing Cloudflare Worker and D1 database, rather than adding a second account provider or datastore. Migration 0002 creates independent deck library and publication tables alongside inventory. The Collection Manager exports its service transport; both applications use the same deployment-owned API origin, session, and expected-account assertion. Discord sign-in has a fixed allowlisted return destination for either tool. The existing public configuration stays disabled until the owner stages the service.

Deckbuilder release `2026-11-27-deck.10` preserves all seven construction profiles and the existing local deck document. Signed-in users open their separate account library explicitly, preview guest-copy adoption under new IDs, edit drafts in memory, and sync against the last confirmed server revision. Uncertain writes reuse the same mutation; conflicting writes retain the unsynced draft for export or explicitly reviewed recovery. There is no persistent account cache. Account changes invalidate private data and do not migrate guest contents automatically.

An unlisted deck is an immutable server-derived projection of one saved deck, not a publication of the account library. It omits private identifiers and inventory, supports owner revocation, and is read-only at `/baku/deckbuilder/?share=<UUID>` with noindex metadata. Publication retries are idempotent. Both Geogan and optional Nanogan support selections survive storage and sharing. The reader does not certify catalog or tournament legality.

## Release and remaining work

Push Services, Collection Manager, and Deckbuilder before updating the main site's pins. A Git push does not provision or deploy the Worker. Apply migration 0002 on the chosen staging D1 database, validate the two real Discord identities, HTTPS cookie behavior, runtime cost, and share revocation before enabling the API origin. No credentials, hosted database or service resources were created by this change.

Deck ownership comparison still reads the local guest collection; a later milestone should connect both account workspaces explicitly without leaking one user's inventory to another or altering guest ownership. Hosted service operations, privacy/export/deletion affordances and remaining catalog/rule coverage remain separate work.
