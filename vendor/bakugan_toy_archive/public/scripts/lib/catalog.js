export const FACTIONS = ['Pyrus', 'Aquos', 'Haos', 'Ventus', 'Darkus', 'Subterra', 'Aurelus'];
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

export function validateCatalog(data) {
  if (!data || data.schemaVersion !== 1 || data.status !== 'pilot') throw new Error('Unsupported catalog format.');
  text(data.catalogRelease, 'catalog release', 80);
  if (data.coverage?.complete !== false) throw new Error('Pilot coverage must be incomplete.');
  text(data.coverage.description, 'coverage description', 1000);
  const sources = records(data.sources, 'source');
  const models = records(data.models, 'model');
  const variants = records(data.variants, 'variant');
  const profiles = records(data.profiles, 'profile');
  const releases = records(data.releases, 'release');
  for (const source of sources.values()) {
    for (const field of ['title', 'section', 'checkedAt']) text(source[field], `source ${field}`);
    if (!safeUrl(source.url) || !/^https?:\/\//i.test(source.url)) throw new Error('Invalid source URL.');
    if (source.revision !== null && !Number.isSafeInteger(source.revision)) throw new Error('Invalid source revision.');
  }
  for (const model of models.values()) {
    for (const field of ['name', 'series', 'edition']) text(model[field], `model ${field}`);
    if (!['G1', 'G2'].includes(model.generation) || !sources.has(model.sourceId)) throw new Error('Invalid model reference or generation.');
    if (!Array.isArray(model.aliases) || model.aliases.length > 20) throw new Error('Invalid model aliases.');
    model.aliases.forEach((alias) => text(alias, 'model alias'));
  }
  for (const profile of profiles.values()) {
    if (!models.has(profile.modelId) || models.get(profile.modelId).generation !== 'G2' || !sources.has(profile.sourceId) || !FACTIONS.includes(profile.faction)) throw new Error('Invalid profile reference.');
    numeric(profile.bPower, 'B-Power'); numeric(profile.damage, 'damage');
    if (profile.bakuCores !== null || profile.compatibility !== 'unverified' || !Array.isArray(profile.cardPrintingIds) || profile.cardPrintingIds.length) throw new Error('Pilot profiles must retain unverified compatibility.');
  }
  for (const variant of variants.values()) {
    const model = models.get(variant.modelId);
    if (!model || !FACTIONS.includes(variant.faction)) throw new Error('Invalid variant reference or faction.');
    if ((model.generation === 'G1' && variant.faction === 'Aurelus') || (model.generation === 'G2' && variant.faction === 'Subterra')) throw new Error('Faction does not match generation.');
    text(variant.treatment, 'treatment'); numeric(variant.gPower, 'G-Power');
    if (model.generation === 'G2' && variant.gPower !== null) throw new Error('G2 toys cannot have G-Power.');
    if (!Array.isArray(variant.profileIds) || new Set(variant.profileIds).size !== variant.profileIds.length || variant.profileIds.some((id) => !profiles.has(id) || profiles.get(id).modelId !== model.id || profiles.get(id).faction !== variant.faction)) throw new Error('Invalid variant profile link.');
    if (!Array.isArray(variant.releaseIds) || variant.releaseIds.some((id) => !releases.has(id))) throw new Error('Invalid release link.');
    if (!sources.has(variant.evidence?.sourceId) || variant.evidence.sourceId !== model.sourceId || variant.evidence.reviewStatus !== 'source-transcribed') throw new Error('Invalid variant evidence.');
    text(variant.evidence.locator, 'evidence locator');
    if (variant.image !== null) {
      if (!safeUrl(variant.image?.url)) throw new Error('Invalid image URL.');
      text(variant.image.credit, 'image credit');
    }
  }
  if (!data.aliases || typeof data.aliases !== 'object' || Array.isArray(data.aliases)) throw new Error('Invalid aliases.');
  for (const [alias, target] of Object.entries(data.aliases)) {
    if (!ID.test(alias) || variants.has(alias) || !variants.has(target)) throw new Error('Invalid variant alias.');
  }
  return data;
}

export function prepareCatalog(data) {
  validateCatalog(data);
  const models = new Map(data.models.map((model) => [model.id, model]));
  return data.variants.map((variant) => {
    const model = models.get(variant.modelId);
    const label = `${variant.faction} ${model.name} · ${model.edition} · ${variant.treatment}${variant.gPower === null ? '' : ` · ${variant.gPower} G`}`;
    return { ...variant, model, label, searchText: fold([label, model.generation, model.series, ...model.aliases].join(' ')) };
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
