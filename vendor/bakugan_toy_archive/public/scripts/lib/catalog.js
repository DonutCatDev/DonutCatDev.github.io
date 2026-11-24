export const FACTIONS = ['Pyrus', 'Aquos', 'Haos', 'Ventus', 'Darkus', 'Subterra', 'Aurelus'];
export const BAKU_CORES = ['Fist', 'Flaming Fist', 'Shield', 'Magic Shield', 'Helix'];
const ID = /^[a-z][a-z0-9-]{0,79}$/;
const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
const fold = (value) => String(value).normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();

export function safeUrl(value, base = 'https://donutcat.org/baku/bakugan-archive/') {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value, base);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

function text(value, label, maximum = 500) {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum) throw new Error(`Invalid ${label}.`);
}

function records(value, label) {
  if (!Array.isArray(value) || value.length > 20000) throw new Error(`Invalid ${label}.`);
  const ids = new Set();
  for (const item of value) {
    if (!item || typeof item !== 'object' || !ID.test(item.id) || ids.has(item.id)) throw new Error(`Invalid or duplicate ${label} ID.`);
    ids.add(item.id);
  }
  return new Map(value.map((item) => [item.id, item]));
}

function numeric(value, label) {
  if (value !== null && (!Number.isSafeInteger(value) || value < 0 || value > 100000)) throw new Error(`Invalid ${label}.`);
}

const digest = (value) => /^[a-f0-9]{64}$/.test(value || '');
const sameCores = (a, b) => Array.isArray(a) && Array.isArray(b) && [...a].sort().join('|') === [...b].sort().join('|');
function cores(value) {
  if (!Array.isArray(value) || value.length !== 2 || value.some((core) => !BAKU_CORES.includes(core))) throw new Error('A paired-core record needs exactly two known icons.');
}

export function cardReference(card) {
  return Object.fromEntries(['id', 'name', 'generation', 'cardType', 'series', 'set', 'factions', 'bPower', 'damage', 'bakuCores', 'imageFile', 'sourceUrl', 'sourceRevision', 'sourceTimestamp'].map((key) => [key, card[key]]));
}

export function cardArchiveUrl(id) {
  if (typeof id !== 'string' || !/^wiki-\d+(?:-\d+)?$/.test(id)) return null;
  return `/baku/bakugan_card_archive/?${new URLSearchParams({ q: id })}`;
}

export function validateCardLinks(catalog, cards, sha256) {
  validateCatalog(catalog);
  if (!catalog.cardPrintings.length) return;
  if (catalog.cardCatalog.sha256 !== sha256 || !Array.isArray(cards?.cards)) throw new Error('Toy links require their exact pinned card catalog.');
  const byId = new Map();
  for (const card of cards.cards) {
    if (byId.has(card.id)) throw new Error('Duplicate card catalog ID.');
    byId.set(card.id, card);
  }
  for (const reference of catalog.cardPrintings) {
    const actual = byId.get(reference.id);
    if (!actual || JSON.stringify(cardReference(actual)) !== JSON.stringify(cardReference(reference))) throw new Error(`Stale or missing card printing: ${reference.id}`);
  }
}

export function revisionUrl(source, revision = source?.revision) {
  if (!Number.isSafeInteger(revision) || revision < 1 || !safeUrl(source?.url)) return null;
  const url = new URL('/index.php', safeUrl(source.url));
  url.search = new URLSearchParams({ title: source.title, oldid: String(revision) }).toString();
  return url.href;
}

export function validateImage(image) {
  if (!image || !safeUrl(image.url)) throw new Error('Invalid image URL.');
  for (const field of ['sourceUrl', 'rightsUrl']) if (!/^https?:\/\//i.test(image[field] || '') || !safeUrl(image[field])) throw new Error('Images need safe source and rights URLs.');
  for (const field of ['credit', 'rights']) text(image[field], `image ${field}`);
  if (!['open', 'closed'].includes(image.view) || !Number.isSafeInteger(image.width) || !Number.isSafeInteger(image.height) || image.width < 1 || image.height < 1 || image.width > 20000 || image.height > 20000) throw new Error('Images need an identification view and intrinsic dimensions.');
  return image;
}

export function validateCatalog(data) {
  if (!data || data.schemaVersion !== 3 || data.status !== 'pilot') throw new Error('Unsupported catalog format.');
  text(data.catalogRelease, 'catalog release', 80);
  if (data.coverage?.complete !== false) throw new Error('Pilot coverage must be incomplete.');
  text(data.coverage.description, 'coverage description', 1000);
  const sources = records(data.sources, 'source');
  const models = records(data.models, 'model');
  const variants = records(data.variants, 'variant');
  const profiles = records(data.profiles, 'profile');
  const cardPrintings = records(data.cardPrintings, 'card printing');
  if (cardPrintings.size) {
    if (!digest(data.cardCatalog?.sha256) || !Number.isFinite(Date.parse(data.cardCatalog.generatedAt))) throw new Error('Card references need a pinned catalog.');
  } else if (data.cardCatalog !== null) throw new Error('An unlinked catalog must keep its card pin null.');
  for (const card of cardPrintings.values()) {
    if (!cardArchiveUrl(card.id) || card.generation !== 'Generation 2' || card.cardType !== 'Character' || !Number.isSafeInteger(card.sourceRevision) || card.sourceRevision < 1 || !Number.isFinite(Date.parse(card.sourceTimestamp)) || !/^https?:\/\//i.test(card.sourceUrl || '') || !safeUrl(card.sourceUrl)) throw new Error('Invalid Character Card reference.');
    for (const key of ['name', 'series', 'set', 'imageFile']) text(card[key], `card ${key}`);
    if (!Array.isArray(card.factions) || card.factions.length !== 1 || !FACTIONS.includes(card.factions[0]) || card.bPower === null || card.damage === null) throw new Error('Character Card needs an exact faction and stats.');
    numeric(card.bPower, 'card B-Power'); numeric(card.damage, 'card damage'); cores(card.bakuCores);
  }
  const releases = records(data.releases, 'release');
  const releaseMembers = new Map();
  for (const release of releases.values()) {
    text(release.name, 'product release name');
    if (release.wave !== null) text(release.wave, 'product release wave', 120);
    if (release.status !== 'source-listed' || !Array.isArray(release.markets) || new Set(release.markets).size !== release.markets.length || release.markets.length > 20) throw new Error('Invalid product release metadata.');
    release.markets.forEach((market) => text(market, 'product release market', 80));
    if (!Array.isArray(release.members) || !release.members.length || release.members.length > variants.size) throw new Error('A product release needs at least one cataloged variant.');
    const members = new Set();
    for (const member of release.members) {
      const variant = variants.get(member?.variantId);
      const proof = variant?.evidence;
      if (members.has(member?.variantId) || proof?.reviewStatus !== 'revision-reviewed' || member.sourceId !== proof.sourceId || member.sourceRevision !== proof.sourceRevision || member.sourceSha256 !== proof.sourceSha256) throw new Error('Invalid or stale product release membership.');
      if (!Array.isArray(variant.releaseIds) || !variant.releaseIds.includes(release.id)) throw new Error('Product release membership is missing its variant link.');
      members.add(member.variantId);
    }
    releaseMembers.set(release.id, members);
  }
  for (const source of sources.values()) {
    for (const field of ['title', 'section', 'checkedAt']) text(source[field], `source ${field}`);
    if (!safeUrl(source.url) || !/^https?:\/\//i.test(source.url)) throw new Error('Invalid source URL.');
    if (source.revision !== null) {
      if (!Number.isSafeInteger(source.revision) || source.revision < 1 || !Number.isSafeInteger(source.pageId) || source.pageId < 1 || !/^[a-f0-9]{64}$/.test(source.sourceSha256 || '') || !['browser-api', 'mediawiki-export'].includes(source.captureMethod) || !Number.isFinite(Date.parse(source.sourceTimestamp)) || !Number.isFinite(Date.parse(source.capturedAt))) throw new Error('Invalid captured source revision.');
    }
    if (source.observedRevision && (!Number.isSafeInteger(source.observedRevision.revision) || source.observedRevision.revision < 1 || source.observedRevision.method !== 'indexed-page' || !Number.isFinite(Date.parse(source.observedRevision.observedAt)))) throw new Error('Invalid indexed revision observation.');
  }
  for (const model of models.values()) {
    for (const field of ['name', 'series', 'edition']) text(model[field], `model ${field}`);
    if (!['G1', 'G2'].includes(model.generation) || !sources.has(model.sourceId)) throw new Error('Invalid model reference or generation.');
    if (model.tableSourceId !== undefined && !sources.has(model.tableSourceId)) throw new Error('Invalid model table source.');
    if (!Array.isArray(model.aliases) || model.aliases.length > 20) throw new Error('Invalid model aliases.');
    model.aliases.forEach((alias) => text(alias, 'model alias'));
  }
  for (const profile of profiles.values()) {
    if (!models.has(profile.modelId) || models.get(profile.modelId).generation !== 'G2' || !sources.has(profile.sourceId) || !FACTIONS.includes(profile.faction)) throw new Error('Invalid profile reference.');
    const model = models.get(profile.modelId);
    if (profile.sourceId !== (model.tableSourceId || model.sourceId)) throw new Error('Profile must use its model table source.');
    numeric(profile.bPower, 'B-Power'); numeric(profile.damage, 'damage');
    if (!Array.isArray(profile.cardPrintingIds)) throw new Error('Invalid profile card links.');
    if (profile.compatibility === 'unverified') {
      if (profile.bakuCores !== null || profile.cardPrintingIds.length || profile.linkEvidence) throw new Error('Unverified profiles must retain unknown cores and empty card links.');
    } else if (profile.compatibility === 'source-matched') {
      cores(profile.bakuCores);
      if (profile.cardPrintingIds.length !== 1) throw new Error('A source match needs exactly one reviewed printing.');
      const card = cardPrintings.get(profile.cardPrintingIds[0]);
      const source = sources.get(profile.sourceId), proof = profile.linkEvidence;
      const expectedName = model.edition === 'Core' ? model.name : `${model.name} ${model.edition}`;
      if (!card || card.name !== expectedName || card.series !== model.series || card.factions[0] !== profile.faction || card.bPower !== profile.bPower || card.damage !== profile.damage || !sameCores(card.bakuCores, profile.bakuCores)) throw new Error('Character Card must match the mold, faction, stats, and both cores.');
      if (!source.revision || !proof || proof.sourceRevision !== source.revision || proof.sourceSha256 !== source.sourceSha256 || proof.cardSourceRevision !== card.sourceRevision || proof.cardCatalogSha256 !== data.cardCatalog.sha256 || !digest(proof.mappingSha256) || !Number.isFinite(Date.parse(proof.reviewedAt))) throw new Error('A card match must retain its exact source evidence.');
      text(proof.reviewer, 'profile reviewer', 120); text(proof.locator, 'profile source locator');
    } else throw new Error('Unsupported profile compatibility state.');
  }
  for (const variant of variants.values()) {
    const model = models.get(variant.modelId);
    if (!model || !FACTIONS.includes(variant.faction)) throw new Error('Invalid variant reference or faction.');
    if ((model.generation === 'G1' && variant.faction === 'Aurelus') || (model.generation === 'G2' && variant.faction === 'Subterra')) throw new Error('Faction does not match generation.');
    text(variant.treatment, 'treatment'); numeric(variant.gPower, 'G-Power');
    if (model.generation === 'G2' && variant.gPower !== null) throw new Error('G2 toys cannot have G-Power.');
    if (!Array.isArray(variant.profileIds) || new Set(variant.profileIds).size !== variant.profileIds.length || variant.profileIds.some((id) => !profiles.has(id) || profiles.get(id).modelId !== model.id || profiles.get(id).faction !== variant.faction)) throw new Error('Invalid variant profile link.');
    if (!Array.isArray(variant.releaseIds) || new Set(variant.releaseIds).size !== variant.releaseIds.length || variant.releaseIds.some((id) => !releaseMembers.get(id)?.has(variant.id))) throw new Error('Invalid release link.');
    if (!sources.has(variant.evidence?.sourceId) || variant.evidence.sourceId !== (model.tableSourceId || model.sourceId) || !['source-transcribed', 'revision-reviewed'].includes(variant.evidence.reviewStatus)) throw new Error('Invalid variant evidence.');
    if (variant.evidence.reviewStatus === 'revision-reviewed') {
      const source = sources.get(variant.evidence.sourceId);
      if (!source.revision || variant.evidence.sourceRevision !== source.revision || variant.evidence.sourceSha256 !== source.sourceSha256 || !Number.isFinite(Date.parse(variant.evidence.reviewedAt))) throw new Error('Reviewed facts must match a captured source revision.');
      text(variant.evidence.reviewer, 'reviewer', 120);
    }
    text(variant.evidence.locator, 'evidence locator');
    if (variant.profileIds.some((id) => profiles.get(id).compatibility === 'source-matched') && variant.evidence.reviewStatus !== 'revision-reviewed') throw new Error('A source-matched profile needs reviewed toy evidence.');
    if (variant.image !== null) {
      validateImage(variant.image);
    }
  }
  const usedPrintings = new Set(data.profiles.flatMap((profile) => profile.cardPrintingIds));
  if (usedPrintings.size !== cardPrintings.size) throw new Error('Card references must be used by a reviewed profile.');
  if (!data.aliases || typeof data.aliases !== 'object' || Array.isArray(data.aliases)) throw new Error('Invalid aliases.');
  for (const [alias, target] of Object.entries(data.aliases)) {
    if (!ID.test(alias) || variants.has(alias) || !variants.has(target)) throw new Error('Invalid variant alias.');
  }
  return data;
}

export function prepareCatalog(data) {
  validateCatalog(data);
  const models = new Map(data.models.map((model) => [model.id, model]));
  const releases = new Map(data.releases.map((release) => [release.id, release]));
  return data.variants.map((variant) => {
    const model = models.get(variant.modelId);
    const products = variant.releaseIds.map((id) => releases.get(id));
    const productTerms = products.flatMap((product) => [product.name, product.wave, ...product.markets]);
    const label = `${variant.faction} ${model.name} · ${model.edition} · ${variant.treatment}${variant.gPower === null ? '' : ` · ${variant.gPower} G`}`;
    return { ...variant, model, products, label, searchText: fold([label, model.generation, model.series, ...model.aliases, ...productTerms].join(' ')) };
  });
}

export function readState(search) {
  const params = new URLSearchParams(search);
  return {
    q: (params.get('q') || '').slice(0, 160),
    generation: ['G1', 'G2'].includes(params.get('generation')) ? params.get('generation') : '',
    faction: FACTIONS.includes(params.get('faction')) ? params.get('faction') : '',
    edition: (params.get('edition') || '').slice(0, 80),
    treatment: (params.get('treatment') || '').slice(0, 80),
    view: params.get('view') === 'variants' ? 'variants' : 'models',
    sort: params.get('sort') === 'generation' ? 'generation' : 'name',
    page: /^\d{1,5}$/.test(params.get('page') || '') ? Math.max(1, Number(params.get('page'))) : 1,
    item: (params.get('item') || '').slice(0, 80)
  };
}

export function writeState(state) {
  const params = new URLSearchParams();
  for (const key of ['q', 'generation', 'faction', 'edition', 'treatment', 'item']) if (state[key]) params.set(key, state[key]);
  if (state.view === 'variants') params.set('view', 'variants');
  if (state.sort === 'generation') params.set('sort', 'generation');
  if (state.page > 1) params.set('page', String(state.page));
  return params.size ? `?${params}` : '';
}

export function selectVariants(variants, state) {
  const words = fold(state.q || '').split(/\s+/).filter(Boolean);
  return variants.filter((variant) => (!state.generation || variant.model.generation === state.generation)
    && (!state.faction || variant.faction === state.faction)
    && (!state.edition || variant.model.edition === state.edition)
    && (!state.treatment || variant.treatment === state.treatment)
    && words.every((word) => variant.searchText.includes(word)))
    .sort((a, b) => (state.sort === 'generation' ? collator.compare(a.model.generation, b.model.generation) : 0)
      || collator.compare(a.model.name, b.model.name) || collator.compare(a.model.edition, b.model.edition)
      || collator.compare(a.faction, b.faction) || collator.compare(a.treatment, b.treatment)
      || (a.gPower ?? -1) - (b.gPower ?? -1) || collator.compare(a.id, b.id));
}

export function groupModels(variants) {
  const groups = new Map();
  for (const variant of variants) {
    if (!groups.has(variant.model.id)) groups.set(variant.model.id, { model: variant.model, variants: [] });
    groups.get(variant.model.id).variants.push(variant);
  }
  return [...groups.values()];
}
