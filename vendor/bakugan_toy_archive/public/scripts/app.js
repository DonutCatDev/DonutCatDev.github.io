import { cardArchiveUrl, FACTIONS, groupModels, prepareCatalog, readState, revisionUrl, safeUrl, selectVariants, writeState } from './lib/catalog.js';

const PAGE_SIZE = 12;
function el(tag, properties = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(properties)) {
    if (key === 'text') node.textContent = value;
    else if (key === 'className') node.className = value;
    else node.setAttribute(key, String(value));
  }
  node.append(...children);
  return node;
}

export function mount(container) {
  const lifecycle = new AbortController();
  const options = { signal: lifecycle.signal };
  let request;
  let searchTimer;
  let data;
  let lastOpenedItem = '';
  let variants = [];
  let state = readState(location.search);
  const originalTitle = document.title;
  const status = el('p', { role: 'status', className: 'status', text: 'Loading the toy catalog…' });
  const retry = el('button', { type: 'button', className: 'primary-button', text: 'Try again', hidden: true });
  const coverage = el('aside', { className: 'coverage', 'aria-label': 'Catalog coverage', hidden: true });
  const form = el('form', { role: 'search', className: 'search-shell search-panel', 'aria-label': 'Find physical Bakugan', hidden: true });
  const search = el('input', { id: 'toy-query', type: 'search', placeholder: 'Try Aquos, 400 G, or Howlkor Starter Set…', maxlength: 160 });
  const searchButton = el('button', { type: 'submit', className: 'primary-button', text: 'Search' });
  const searchLabel = el('label', { className: 'visually-hidden', for: 'toy-query', text: 'Search Bakugan' });
  const searchRow = el('div', { className: 'search-field search-row' }, [el('span', { className: 'search-icon', 'aria-hidden': 'true' }), search, searchButton]);
  const filterRow = el('div', { className: 'filters filter-grid' });
  const controls = {};
  const definitions = [
    ['generation', 'Generation', [['', 'All generations'], ['G1', 'Generation 1'], ['G2', 'Generation 2']]],
    ['faction', 'Attribute / faction', [['', 'All attributes / factions'], ...FACTIONS.map((value) => [value, value])]],
    ['edition', 'Mold / edition', []], ['treatment', 'Treatment', []],
    ['view', 'Browse by', [['models', 'Molds'], ['variants', 'Variants']]],
    ['sort', 'Sort', [['name', 'Name'], ['generation', 'Generation, then name']]]
  ];
  for (const [key, label, entries] of definitions) {
    const select = el('select', { id: `toy-${key}` });
    entries.forEach(([value, text]) => select.append(el('option', { value, text })));
    controls[key] = select;
    filterRow.append(el('div', { className: 'field facet' }, [el('label', { for: select.id, text: label }), select]));
    select.addEventListener('change', () => change({ [key]: select.value, page: 1 }), options);
  }
  const clear = el('button', { type: 'button', className: 'clear-button secondary', text: 'Clear filters' });
  const filterDetails = el('details', { className: 'filter-details' }, [el('summary', { text: 'Filters and view options' }), filterRow]);
  filterDetails.open = window.matchMedia('(min-width: 48rem)').matches;
  form.append(searchLabel, searchRow, filterDetails, clear);
  const summary = el('p', { className: 'result-summary', role: 'status', 'aria-live': 'polite' });
  const itemNotice = el('p', { className: 'notice', role: 'status', hidden: true });
  const results = el('div', { className: 'results', 'aria-label': 'Bakugan results', 'aria-busy': 'true' });
  const previous = el('button', { type: 'button', className: 'page-button', text: 'Previous page' });
  const next = el('button', { type: 'button', className: 'page-button', text: 'Next page' });
  const pageLabel = el('span');
  const paging = el('nav', { className: 'paging', 'aria-label': 'Result pages', hidden: true }, [previous, pageLabel, next]);
  const dialogBody = el('div', { className: 'dialog-body' });
  const close = el('button', { type: 'button', className: 'dialog-close', 'aria-label': 'Close details', text: '×' });
  const dialog = el('dialog', { className: 'card-dialog', 'aria-labelledby': 'toy-detail-heading' }, [close, dialogBody]);
  container.replaceChildren(status, retry, form, coverage, itemNotice, summary, results, paging, dialog);

  function syncControls() {
    search.value = state.q;
    for (const [key, select] of Object.entries(controls)) {
      select.querySelector('[data-unavailable]')?.remove();
      if (![...select.options].some((option) => option.value === state[key])) {
        select.append(el('option', { value: state[key], text: `Unavailable: ${state[key]}`, 'data-unavailable': 'true' }));
      }
      select.value = state[key];
    }
  }

  function change(patch, historyMode = 'push') {
    clearTimeout(searchTimer);
    state = { ...state, ...patch };
    const target = `${location.pathname}${writeState(state)}${location.hash}`;
    if (target !== `${location.pathname}${location.search}${location.hash}`) history[`${historyMode}State`](null, '', target);
    render();
  }

  function picture(image, label, { detail = false, representative = false } = {}) {
    const url = safeUrl(image?.url, document.baseURI);
    if (!url) return el('div', { className: 'image-placeholder', text: 'Toy image not available' });
    const img = el('img', { src: url, alt: `${label}, ${image.view} view`, loading: detail ? 'eager' : 'lazy', width: image.width, height: image.height });
    img.addEventListener('error', () => img.replaceWith(el('div', { className: 'image-placeholder', text: 'Toy image unavailable' })), { ...options, once: true });
    const caption = el('figcaption', { className: 'detail-note' }, [
      document.createTextNode(`${representative ? `Example variant: ${label}. ` : ''}${image.credit}. `),
      el('a', { href: safeUrl(image.sourceUrl), target: '_blank', rel: 'noopener noreferrer', text: 'Photo source' }),
      document.createTextNode(' · '),
      el('a', { href: safeUrl(image.rightsUrl), target: '_blank', rel: 'noopener noreferrer', text: image.rights })
    ]);
    return el('figure', { className: 'toy-photo' }, [img, caption]);
  }

  function variantButton(variant) {
    return el('button', { type: 'button', className: 'variant-link', 'data-item': variant.id, 'aria-label': `${variant.label}. View details`, text: `${variant.faction} · ${variant.treatment}${variant.gPower === null ? '' : ` · ${variant.gPower} G`}` });
  }

  function showDetails() {
    const variant = variants.find((item) => item.id === (data.aliases[state.item] || state.item));
    itemNotice.hidden = !state.item || Boolean(variant);
    itemNotice.textContent = state.item && !variant ? 'This variant link is not in the pilot catalog. You can still browse or clear the filters to start over.' : '';
    if (!variant) {
      if (dialog.open) {
        dialog.close();
        const trigger = [...results.querySelectorAll('[data-item]')].find((button) => button.dataset.item === lastOpenedItem);
        if (trigger) trigger.focus();
        else { summary.setAttribute('tabindex', '-1'); summary.focus(); }
      }
      document.title = originalTitle;
      return;
    }
    const heading = el('h2', { id: 'toy-detail-heading', tabindex: '-1', text: variant.label });
    lastOpenedItem = variant.id;
    const details = el('dl', { className: 'detail-grid facts' });
    const fact = (label, value) => details.append(el('div', { className: 'detail-item' }, [el('dt', { text: label }), el('dd', { text: value })]));
    fact('Generation', variant.model.generation === 'G1' ? 'Generation 1' : 'Generation 2');
    fact('Series', variant.model.series);
    fact('Mold / edition', variant.model.edition);
    fact('Attribute / faction', variant.faction);
    fact('Treatment', variant.treatment);
    fact('Printed G-Power', variant.model.generation !== 'G1' ? 'Not applicable' : variant.gPower === null ? 'Unknown' : `${variant.gPower} G`);
    const profiles = data.profiles.filter((profile) => variant.profileIds.includes(profile.id));
    for (const profile of profiles) {
      fact('Source-listed B-Power', profile.bPower === null ? 'Unknown' : String(profile.bPower));
      fact('Source-listed damage', profile.damage === null ? 'Unknown' : String(profile.damage));
      fact('Paired BakuCores', profile.bakuCores ? profile.bakuCores.join(' + ') : 'Not yet recorded');
      if (profile.compatibility === 'source-matched') {
        const card = data.cardPrintings.find((item) => item.id === profile.cardPrintingIds[0]);
        details.append(el('div', { className: 'detail-item' }, [el('dt', { text: 'Matched Character Card' }), el('dd', {}, [
          el('a', { href: cardArchiveUrl(card.id), text: `${profile.faction} ${card.name} (${card.set})` })
        ])]));
        fact('Match review', 'Matched to the captured source row. Format legality has not been checked.');
      } else fact('Character Card compatibility', 'Not yet verified');
    }
    const source = data.sources.find((item) => item.id === variant.evidence.sourceId);
    const products = el('section', {}, [
      el('h3', { text: 'Product releases' }),
      variant.products.length ? el('ul', {}, variant.products.map((product) => {
        const label = [product.name, product.wave, product.markets.join(', ')].filter(Boolean).join(' · ');
        return el('li', { text: label });
      })) : el('p', { className: 'detail-note', text: 'No packages have been matched to this variant yet.' })
    ]);
    if (variant.products.length) products.append(el('p', { className: 'detail-note', text: 'Packages listed in the source table below.' }));
    const sourceLink = el('a', { href: safeUrl(source.url), target: '_blank', rel: 'noopener noreferrer', text: `Source: ${source.title}` });
    const article = data.sources.find((item) => item.id === variant.model.sourceId);
    const articleNote = el('p', { className: 'detail-note' });
    if (article.id !== source.id) {
      articleNote.append(el('a', { href: article.revision ? revisionUrl(article) : safeUrl(article.url), target: '_blank', rel: 'noopener noreferrer', text: `Mold article: ${article.title}${article.revision ? ` (revision ${article.revision})` : ''}` }),
        document.createTextNode(' — article and table revisions are captured separately.'));
    }
    const direct = new URL(location.href);
    direct.search = new URLSearchParams({ item: variant.id }).toString();
    direct.hash = '';
    const permalink = el('a', { href: direct.href, text: 'Direct link to this variant' });
    const provenance = el('p', { className: 'detail-note' });
    if (source.revision) {
      provenance.append(document.createTextNode(`Captured ${source.capturedAt.slice(0, 10)}. `), el('a', { href: revisionUrl(source), target: '_blank', rel: 'noopener noreferrer', text: `Source revision ${source.revision}` }));
    } else if (source.observedRevision) {
      provenance.append(el('a', { href: revisionUrl(source, source.observedRevision.revision), target: '_blank', rel: 'noopener noreferrer', text: `Indexed revision ${source.observedRevision.revision}` }), document.createTextNode(` observed ${source.observedRevision.observedAt}. A revision snapshot has not been imported.`));
    } else provenance.textContent = `Source checked ${source.checkedAt}; a revision snapshot has not been imported.`;
    const reviewText = variant.evidence.reviewStatus === 'revision-reviewed'
      ? `Catalog facts reviewed against the captured revision on ${variant.evidence.reviewedAt.slice(0, 10)}. This is not a deck-legality ruling.`
      : 'Pilot entry transcribed from a source table; its facts have not yet been reviewed against a captured revision. This is not a deck-legality ruling.';
    dialogBody.replaceChildren(heading, picture(variant.image, variant.label, { detail: true }), details, products,
      el('p', { className: 'detail-note', text: reviewText }),
      sourceLink, el('p', { className: 'detail-note', text: `${source.section} / ${variant.evidence.locator}.` }), provenance, ...(articleNote.childNodes.length ? [articleNote] : []),
      el('p', {}, [permalink]));
    document.title = `${variant.label} | Bakugan Toy Archive`;
    if (!dialog.open) { dialog.showModal(); heading.focus(); }
  }

  function render() {
    if (!data || lifecycle.signal.aborted) return;
    syncControls();
    const matching = selectVariants(variants, state);
    const groups = groupModels(matching);
    const entries = state.view === 'models' ? groups : matching;
    const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
    if (state.page > totalPages) {
      state.page = totalPages;
      history.replaceState(null, '', `${location.pathname}${writeState(state)}${location.hash}`);
    }
    summary.textContent = `${matching.length} of ${variants.length} variants · ${groups.length} of ${data.models.length} molds${state.q ? ` · Search: ${state.q}` : ''}`;
    const nodes = [];
    for (const entry of entries.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE)) {
      const isGroup = state.view === 'models';
      const model = entry.model;
      const tile = el('article', { className: 'toy-tile card-result' });
      const example = isGroup ? entry.variants.find((variant) => variant.image) : entry;
      tile.append(picture(example?.image, example?.label || model.name, { representative: isGroup }),
        el('div', { className: 'tile-body' }, [
          el('p', { className: 'eyebrow', text: `${model.generation} · ${model.series}` }),
          el('h2', { text: model.name }), el('p', { className: 'edition', text: model.edition })
        ]));
      const body = tile.querySelector('.tile-body');
      if (isGroup) {
        body.append(el('p', { className: 'detail-note', text: `${entry.variants.length} matching variants` }));
        const list = el('ul', { className: 'variant-list' });
        entry.variants.forEach((variant) => list.append(el('li', {}, [variantButton(variant)])));
        body.append(list);
      } else body.append(variantButton(entry));
      nodes.push(tile);
    }
    if (!nodes.length) nodes.push(el('div', { className: 'empty-state' }, [el('h2', { text: variants.length ? 'No Bakugan in this corner.' : 'The catalog is empty.' }), el('p', { text: variants.length ? 'Try fewer filters or a different name. The pilot only covers a small part of the toy catalog.' : 'Please try again later.' })]));
    results.replaceChildren(...nodes);
    results.setAttribute('aria-busy', 'false');
    paging.hidden = totalPages < 2;
    pageLabel.textContent = `Page ${state.page} of ${totalPages}`;
    previous.disabled = state.page <= 1;
    next.disabled = state.page >= totalPages;
    showDetails();
  }

  async function load() {
    request?.abort();
    request = new AbortController();
    const current = request;
    status.hidden = false;
    status.textContent = 'Loading the toy catalog…';
    retry.hidden = true;
    results.setAttribute('aria-busy', 'true');
    try {
      const response = await fetch(new URL('../data/toys.json', import.meta.url), { signal: current.signal });
      if (!response.ok) throw new Error('Catalog request failed.');
      const raw = await response.text();
      if (raw.length > 4 * 1024 * 1024) throw new Error('Catalog is too large.');
      const nextData = JSON.parse(raw);
      const nextVariants = prepareCatalog(nextData);
      if (lifecycle.signal.aborted || current.signal.aborted) return;
      data = nextData; variants = nextVariants;
      for (const [key, values] of [['edition', data.models.map((model) => model.edition)], ['treatment', variants.map((variant) => variant.treatment)]]) {
        controls[key].replaceChildren(el('option', { value: '', text: key === 'edition' ? 'All molds / editions' : 'All treatments' }));
        [...new Set(values)].sort().forEach((value) => controls[key].append(el('option', { value, text: value })));
      }
      const reviewedCount = data.variants.filter((variant) => variant.evidence.reviewStatus === 'revision-reviewed').length;
      const imageCount = data.variants.filter((variant) => variant.image).length;
      const linkedCount = data.profiles.filter((profile) => profile.compatibility === 'source-matched').length;
      coverage.replaceChildren(el('strong', { text: 'A pilot, with plenty left to find.' }),
        el('p', { text: `${data.variants.length} variants · ${reviewedCount} reviewed against captured revisions · ${imageCount} with identification photos. ${linkedCount} of ${data.profiles.length} Character Card profiles matched. Format legality has not been checked.` }),
        el('details', {}, [el('summary', { text: 'What this pilot covers' }), el('p', { text: data.coverage.description }),
          el('p', { text: `${data.releases.length} source-listed products. Search by product name or open a variant to see its packages.` })]));
      coverage.hidden = false; form.hidden = false; status.hidden = true;
      render();
    } catch (error) {
      if (error.name === 'AbortError' || lifecycle.signal.aborted) return;
      status.textContent = 'The toy catalog could not be loaded. Please try again.';
      retry.hidden = false;
      results.setAttribute('aria-busy', 'false');
    }
  }

  retry.addEventListener('click', load, options);
  form.addEventListener('submit', (event) => { event.preventDefault(); change({ q: search.value, page: 1 }); }, options);
  search.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => change({ q: search.value, page: 1 }, 'replace'), 180); }, options);
  clear.addEventListener('click', () => change({ ...readState(''), view: state.view, sort: state.sort }), options);
  previous.addEventListener('click', () => change({ page: state.page - 1 }), options);
  next.addEventListener('click', () => change({ page: state.page + 1 }), options);
  results.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-item]');
    if (button && results.contains(button)) change({ item: button.dataset.item });
  }, options);
  close.addEventListener('click', () => change({ item: '' }), options);
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); change({ item: '' }); }, options);
  window.addEventListener('popstate', () => { clearTimeout(searchTimer); state = readState(location.search); render(); }, options);
  load();
  return () => {
    lifecycle.abort(); request?.abort(); clearTimeout(searchTimer);
    if (dialog.open) dialog.close();
    document.title = originalTitle;
    container.replaceChildren();
  };
}
