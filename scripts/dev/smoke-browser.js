// Optional browser QA with an installed Chromium browser and Node's native CDP client.
// No downloaded browser, packages, persistent browser profile, or external data writes.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildPages } from './build-pages.js';
import { createPreviewServer } from './serve.js';

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const candidates = [process.env.BROWSER_PATH, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].filter(Boolean);
let executable;
for (const candidate of candidates) { try { await access(candidate); executable = candidate; break; } catch { /* Try the next installed browser. */ } }
if (!executable) throw new Error('Set BROWSER_PATH to an installed Chromium browser.');
const root = await buildPages();
const server = createPreviewServer(root);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const profile = await mkdtemp(join(tmpdir(), 'donutcat-browser-'));
const browser = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-sync', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let socket;
let sequence = 0;
const pending = new Map();
const errors = [];
let intercept;
let checks = 0;
let browserFailure;
browser.on('error', (error) => { browserFailure = error; });

async function until(action, description, timeout = 15000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
        if (browserFailure) throw browserFailure;
        const value = await action();
        if (value) return value;
        await pause(80);
    }
    throw new Error(`Timed out: ${description}`);
}
function call(method, params = {}) {
    const id = ++sequence;
    if (process.env.SMOKE_DEBUG) console.log('CDP send', id, method);
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
        pending.set(id, { resolve: (value) => { clearTimeout(timeout); resolve(value); }, reject: (error) => { clearTimeout(timeout); reject(error); } });
        socket.send(JSON.stringify({ id, method, params }));
    });
}
async function evaluate(expression) {
    const response = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    return response.result.value;
}
async function navigate(path, ready) {
    const previousOrigin = await evaluate('performance.timeOrigin');
    await call('Page.navigate', { url: `${origin}${path}` });
    await until(() => evaluate(`performance.timeOrigin !== ${previousOrigin} && location.pathname === ${JSON.stringify(new URL(path, origin).pathname)} && (${ready || "Boolean(document.querySelector('h1'))"})`), `navigation to ${path}`);
}
function passed(message) { checks++; console.log(`PASS ${message}`); }
async function readyCatalog() { await until(() => evaluate("document.querySelector('.result-summary')?.textContent.includes('of 979 variants') && !document.querySelector('.search-panel').hidden"), 'catalog loaded'); }
async function readyCollection() { await until(() => evaluate("Boolean(document.querySelector('#inventory-result-count')) && document.querySelector('.collection-manager').textContent.includes('catalog items.')"), 'collection catalogs loaded'); }
async function choose(key, value) { await evaluate(`(() => { const control = document.getElementById(${JSON.stringify(`toy-${key}`)}); control.value = ${JSON.stringify(value)}; control.dispatchEvent(new Event('change', { bubbles: true })); })()`); }
async function archiveTheme() {
    await until(() => evaluate("getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() === '#040b1b'"), 'archive stylesheet loaded');
    return evaluate(`(() => {
        const read = (selector, properties) => {
            const style = getComputedStyle(document.querySelector(selector));
            return Object.fromEntries(properties.map(property => [property, style.getPropertyValue(property)]));
        };
        return {
            body: read('body', ['font-family', 'font-size', 'color', 'background-color', 'background-image']),
            heading: read('.hero h1', ['font-size', 'font-weight', 'letter-spacing', 'color']),
            brand: read('.brand-mark', ['background-image', 'border-radius']),
            search: read('.search-shell', ['background-color', 'border-radius', 'border-color']),
            primary: read('.primary-button', ['color', 'background-color', 'border-radius']),
            dialog: read('.card-dialog', ['color', 'background-color', 'border-radius'])
        };
    })()`);
}

try {
    const port = await until(async () => { try { return (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; } catch { return null; } }, 'browser debugging port');
    const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await once(socket, 'open');
    socket.addEventListener('message', ({ data }) => {
        if (process.env.SMOKE_DEBUG) console.log('CDP receive', String(data).slice(0, 250));
        const message = JSON.parse(data);
        if (message.id) {
            const task = pending.get(message.id); pending.delete(message.id);
            if (message.error) task?.reject(new Error(message.error.message));
            else task?.resolve(message.result);
        }
        if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
        if (message.method === 'Fetch.requestPaused') {
            Promise.resolve(intercept?.(message.params)).catch((error) => errors.push(error.message));
        }
    });
    await call('Page.enable');
    await call('Page.bringToFront');
    await call('Runtime.enable');
    await call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });

    for (const path of ['/', '/bey', '/bey/prizing-calculator', '/bey/dmvbx-topcut-data', '/foam', '/foam/fps-energy', '/printing', '/printing/print-filament-grid', '/not-a-route']) {
        await navigate(path);
        assert.equal(await evaluate("document.querySelectorAll('main h1').length"), 1);
        assert.ok(await evaluate("document.querySelector('link[rel=canonical]').href.startsWith('https://donutcat.org/')"));
        passed(`direct refresh and single heading: ${path}`);
    }
    await call('Page.navigate', { url: `${origin}/bey/dmvbx-topcut-data-2` });
    await until(() => evaluate("location.pathname === '/bey/dmvbx-topcut-data' && Boolean(document.querySelector('h1'))"), 'alias destination');
    assert.equal(await evaluate('location.pathname'), '/bey/dmvbx-topcut-data');
    passed('legacy alias canonicalizes');
    await navigate('/baku/bakugan_card_archive/', "Boolean(document.querySelector('.search-shell'))");
    const cardTheme = await archiveTheme();
    const sharedStyles = await (await fetch(`${origin}/styles/bakugan-archive.css`)).text();
    assert.equal(sharedStyles, await (await fetch(`${origin}/baku/bakugan_card_archive/styles/main.css`)).text());
    await navigate('/baku');
    await evaluate("document.querySelector('.project-grid a[href=\"/baku/bakugan-archive\"]').click()");
    await readyCatalog();
    assert.equal(await evaluate('location.pathname'), '/baku/bakugan-archive/');
    assert.equal(await evaluate("document.querySelectorAll('.toy-tile').length"), 12);
    assert.equal(await evaluate("document.querySelector('meta[name=robots]').content"), 'noindex,follow');
    assert.equal(await evaluate("document.querySelector('h1').textContent"), 'Bakugan Toy Archive');
    await evaluate('history.back()');
    await until(() => evaluate("location.pathname === '/baku' && document.querySelector('h1')?.textContent === 'Bakugan resources'"), 'Back restores hub');
    await evaluate('history.forward()'); await readyCatalog();
    assert.equal(await evaluate("document.querySelectorAll('script[src$=\"bootstrap.js\"]').length"), 1);
    passed('hub navigation loads standalone pilot and metadata');
    assert.deepEqual(await archiveTheme(), cardTheme);
    passed('card and toy archives share the same baseline stylesheet and computed theme');
    await choose('generation', 'G1');
    assert.match(await evaluate("document.querySelector('.result-summary').textContent"), /^558 of 979 variants/);
    await evaluate("document.getElementById('toy-query').value = 'Delta Dragonoid'; document.querySelector('.search-panel').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))");
    assert.match(await evaluate("document.querySelector('.result-summary').textContent"), /^20 of 979 variants/);
    await choose('faction', 'Pyrus');
    assert.match(await evaluate("document.querySelector('.result-summary').textContent"), /^9 of 979 variants/);
    await choose('treatment', 'Pearl');
    assert.match(await evaluate("document.querySelector('.result-summary').textContent"), /^1 of 979 variants/);
    await evaluate("document.querySelector('[data-item]').click()");
    assert.equal(await evaluate("document.querySelector('dialog').open"), true);
    assert.equal(await evaluate('document.activeElement.id'), 'toy-detail-heading');
    assert.match(await evaluate("document.querySelector('#toy-detail-heading').textContent"), /560 G/);
    assert.equal(await evaluate("document.querySelector('dialog a[target=_blank]').rel"), 'noopener noreferrer');
    assert.match(await evaluate("document.querySelector('dialog').textContent"), /Catalog facts reviewed against the captured revision/);
    assert.equal(await evaluate("document.querySelector('dialog a[href*=\"Template\"]').href.includes('B1_Delta_Dragonoid_Bakulog')"), true);
    assert.equal(await evaluate("document.querySelector('dialog a[href*=oldid]').href.includes('oldid=849669')"), true);
    assert.equal(await evaluate("Boolean(document.querySelector('dialog a[href*=\"oldid=858181\"]'))"), true);
    assert.match(await evaluate("document.querySelector('.coverage').textContent"), /979 reviewed against captured revisions/);
    assert.match(await evaluate("document.querySelector('.coverage').textContent"), /365 documented product records.*446 of 979 variants with matched product releases/);
    await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
    await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
    await until(() => evaluate("!document.querySelector('dialog').open"), 'Escape closes details');
    assert.equal(await evaluate('document.activeElement.dataset.item'), 'toy-0004');
    await evaluate('history.back()');
    await until(() => evaluate("document.querySelector('dialog').open"), 'Back restores details');
    await evaluate('history.forward()');
    await until(() => evaluate("!document.querySelector('dialog').open"), 'Forward closes details');
    passed('intersecting filters, keyboard dialog, Back/Forward, safe source links');
    await navigate('/baku/bakugan-archive/?generation=G1&q=Preyas&edition=28+mm+%28B1%29'); await readyCatalog();
    assert.equal(await evaluate("document.querySelector('details.variant-overflow').open"), false);
    await evaluate("document.querySelector('details.variant-overflow summary').focus()");
    assert.equal(await evaluate('document.activeElement.tagName'), 'SUMMARY');
    await call('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', text: ' ', windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32 });
    await call('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32 });
    await until(() => evaluate("document.querySelector('details.variant-overflow').open"), 'keyboard opens native model disclosure');
    await evaluate("document.querySelector('[data-item=toy-0742]').click()");
    assert.match(await evaluate("document.querySelector('#toy-detail-heading').textContent"), /Gacha\.BAKU/);
    assert.match(await evaluate("document.querySelector('dialog').textContent"), /Source attribute \/ shell colorHaos/);
    assert.match(await evaluate("document.querySelector('dialog').textContent"), /Listed attribute wheelAquos \/ Subterra \/ Ventus/);
    await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
    await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
    await until(() => evaluate("!document.querySelector('dialog').open"), 'Escape closes an overflow variant detail');
    assert.equal(await evaluate('document.activeElement.dataset.item'), 'toy-0742');
    assert.equal(await evaluate("document.querySelector('details.variant-overflow').open"), true);
    await navigate('/baku/bakugan-archive/?item=toy-0688', "Boolean(document.querySelector('dialog')?.open)");
    assert.match(await evaluate("document.querySelector('dialog').textContent"), /BakuNeon/);
    assert.match(await evaluate("document.querySelector('dialog').textContent"), /Printed G-PowerUnknown/);
    await evaluate("document.querySelector('dialog .dialog-close').click()");
    passed('legacy physical distinctions, shell and wheel attributes, unknown power, and accessible model disclosure');
    await evaluate("document.querySelector('.secondary').click(); const query = document.getElementById('toy-query'); query.value = '<img src=x onerror=window.injected=true>'; query.dispatchEvent(new Event('input', { bubbles: true }))");
    await until(() => evaluate("document.querySelector('.result-summary').textContent.startsWith('0 of')"), 'empty search');
    assert.equal(await evaluate('Boolean(window.injected)'), false);
    assert.equal(await evaluate("document.querySelector('.empty-state h2').textContent"), 'No Bakugan in this corner.');
    await evaluate("document.querySelector('.secondary').click()");
    await choose('view', 'variants');
    assert.equal(await evaluate("document.querySelectorAll('.toy-tile').length"), 12);
    await evaluate("document.querySelector('.paging button:last-child').click()");
    assert.equal(await evaluate("new URLSearchParams(location.search).get('page')"), '2');
    await call('Page.reload'); await readyCatalog();
    assert.equal(await evaluate("document.querySelector('.paging span').textContent"), 'Page 2 of 82');
    passed('safe URL/search text, empty state, pagination and direct refresh');
    await navigate('/baku/bakugan-archive/?item=toy-0043', "Boolean(document.querySelector('dialog')?.open)");
    assert.match(await evaluate('document.title'), /Aquos Hydorous/);
    assert.match(await evaluate("document.querySelector('dialog').textContent"), /Shield \+ Shield/);
    assert.match(await evaluate("document.querySelector('dialog').textContent"), /Format legality has not been checked/);
    assert.equal(await evaluate("document.querySelector('dialog a[href*=bakugan_card_archive]').getAttribute('href')"), '/baku/bakugan_card_archive/?q=wiki-279791');
    await evaluate("document.querySelector('dialog a[href*=bakugan_card_archive]').click()");
    await until(() => evaluate("document.querySelectorAll('#card-grid .card-result').length === 1"), 'exact matched card printing');
    assert.equal(await evaluate("new URLSearchParams(location.search).get('q')"), 'wiki-279791');
    await evaluate("document.querySelector('#card-grid .card-result').click()");
    assert.match(await evaluate("document.querySelector('#card-dialog').textContent"), /Shield, Shield/);
    assert.match(await evaluate("document.querySelector('#card-dialog').textContent"), /Hydorous Ultra/);
    await evaluate('history.back()');
    await until(() => evaluate("location.pathname === '/baku/bakugan-archive/' && Boolean(document.querySelector('dialog')?.open)"), 'Back restores toy details');
    passed('reviewed paired cores and exact Character Card link survive cross-archive navigation');
    await navigate('/baku/bakugan-archive/?item=missing', "Boolean(document.querySelector('.notice') && !document.querySelector('.notice').hidden)");
    assert.equal(await evaluate("document.querySelector('dialog').open"), false);
    passed('direct variant links and unknown item recovery');

    await navigate('/baku/bakugan-archive/?q=Haos+Howlkor+Ultra+Starter+Set&series=Battle+Planet&view=variants'); await readyCatalog();
    assert.match(await evaluate("document.querySelector('.result-summary').textContent"), /^3 of 979 variants/);
    await evaluate("document.querySelector('[data-item=toy-0033]').click()");
    assert.match(await evaluate("document.querySelector('dialog').textContent"), /Haos Howlkor Ultra Starter Set/);
    await navigate('/baku/bakugan-archive/?item=toy-0006', "Boolean(document.querySelector('dialog')?.open)");
    assert.match(await evaluate("document.querySelector('dialog').textContent"), /No packages have been matched/);
    passed('product search finds shared package contents and unmatched variants explain the gap');

    await navigate('/baku/bakugan-archive/?item=toy-0049', "Boolean(document.querySelector('dialog')?.open)");
    assert.match(await evaluate("document.querySelector('dialog').textContent"), /Base Character Card link pending review/);
    assert.equal(await evaluate("document.querySelector('dialog').textContent.includes('Source-listed B-Power')"), false);
    await navigate('/baku/bakugan-archive/?item=toy-0055', "Boolean(document.querySelector('dialog')?.open)");
    assert.match(await evaluate("document.querySelector('dialog').textContent"), /1000/);
    assert.match(await evaluate("document.querySelector('dialog').textContent"), /Not yet verified/);
    passed('special treatments retain distinct variants and honest gameplay evidence');
    await navigate('/baku/bakugan-archive/?q=Gear+Up+Pack&treatment=Hexagonal&faction=Ventus&view=variants'); await readyCatalog();
    assert.match(await evaluate("document.querySelector('.result-summary').textContent"), /^1 of 979 variants/);
    await evaluate("document.querySelector('[data-item=toy-0098]').click()");
    assert.match(await evaluate("document.querySelector('dialog').textContent"), /Gear Up Pack \(Hexagonal\)/);
    assert.match(await evaluate("document.querySelector('dialog').textContent"), /Base Character Card link pending review/);
    assert.equal(await evaluate("document.querySelector('dialog').textContent.includes('Source-listed B-Power')"), false);
    await navigate('/baku/bakugan-archive/?item=toy-0097', "Boolean(document.querySelector('dialog')?.open)");
    assert.match(await evaluate("document.querySelector('dialog').textContent"), /Baku-Gear Solo \(Translucent\)/);
    passed('treated variants have independent package search, direct links, and pending gameplay evidence');
    await navigate('/baku/bakugan-archive/?series=Armored+Alliance'); await readyCatalog();
    assert.match(await evaluate("document.querySelector('.result-summary').textContent"), /^169 of 979 variants/);
    assert.equal(await evaluate("document.querySelectorAll('.toy-tile').length"), 12);
    await call('Page.reload'); await readyCatalog();
    assert.equal(await evaluate("document.getElementById('toy-series').value"), 'Armored Alliance');
    await navigate('/baku/bakugan-archive/?item=toy-0065', "Boolean(document.querySelector('dialog')?.open)");
    assert.match(await evaluate("document.querySelector('#toy-detail-heading').textContent"), /Armored Alliance/);
    assert.match(await evaluate("document.querySelector('dialog').textContent"), /Fist \+ Fist/);
    assert.equal(await evaluate("document.querySelector('dialog a[href*=bakugan_card_archive]').getAttribute('href')"), '/baku/bakugan_card_archive/?q=wiki-291159');
    passed('series filter and refresh distinguish season-specific variants and exact card links');

    await navigate('/baku/bakugan-archive/?series=Armored+Alliance&q=Batrix&edition=Ultra&view=variants'); await readyCatalog();
    assert.match(await evaluate("document.querySelector('.result-summary').textContent"), /^5 of 979 variants/);
    await evaluate("document.querySelector('[data-item=toy-0383]').click()");
    assert.match(await evaluate("document.querySelector('dialog').textContent"), /Translucent/);
    assert.match(await evaluate("document.querySelector('dialog').textContent"), /Base Character Card link pending review/);
    assert.match(await evaluate("document.querySelector('dialog').textContent"), /Batrix Ultra \/ Darkus Ramparian Ultra Baku-Gear Pack/);
    await navigate('/baku/bakugan-archive/?series=Battle+Planet&q=Phaedrus&edition=Ultra&faction=Darkus&view=variants'); await readyCatalog();
    assert.match(await evaluate("document.querySelector('.result-summary').textContent"), /^1 of 979 variants/);
    assert.match(await evaluate("document.querySelector('.toy-tile').textContent"), /Diamond/);
    passed('bulk-capture cross-source release evidence and Diamond-only exclusion remain searchable');

    await navigate('/baku/bakugan-archive/?q=Darkus+Hydorous+Ultra+Aurelus+Garganoid+Ultra+Battle+Pack&series=Battle+Planet&view=variants'); await readyCatalog();
    assert.match(await evaluate("document.querySelector('.result-summary').textContent"), /^5 of 979 variants/);
    await navigate('/baku/bakugan-archive/?q=Pyrus+Pegatrix+Ultra+Baku-Gear+Solo&series=Armored+Alliance&view=variants'); await readyCatalog();
    assert.match(await evaluate("document.querySelector('.result-summary').textContent"), /^1 of 979 variants/);
    await evaluate("document.querySelector('[data-item=toy-0436]').click()");
    assert.match(await evaluate("document.querySelector('dialog').textContent"), /Translucent/);
    assert.match(await evaluate("document.querySelector('dialog').textContent"), /Base Character Card link pending review/);
    passed('shared pack grouping and late gear-solo correction resolve to the exact collectible variants');

    await call('Fetch.enable', { patterns: [{ urlPattern: '*data/toys.json*', requestStage: 'Request' }] });
    intercept = ({ requestId }) => call('Fetch.failRequest', { requestId, errorReason: 'InternetDisconnected' });
    await navigate('/baku/bakugan-archive/', "Boolean(document.querySelector('#catalog > button') && !document.querySelector('#catalog > button').hidden)");
    await call('Fetch.disable'); intercept = null;
    await evaluate("document.querySelector('#catalog > button').click()");
    await readyCatalog();
    passed('network failure and working retry');
    await call('Fetch.enable', { patterns: [{ urlPattern: '*data/toys.json*', requestStage: 'Request' }] });
    intercept = ({ requestId }) => call('Fetch.fulfillRequest', { requestId, responseCode: 200, body: Buffer.from('{bad-json').toString('base64') });
    await navigate('/baku/bakugan-archive/', "Boolean(document.querySelector('#catalog > button') && !document.querySelector('#catalog > button').hidden)");
    passed('malformed catalog recovery');
    const empty = JSON.parse(await readFile(join(root, 'baku/bakugan-archive/data/toys.json'), 'utf8'));
    empty.models = []; empty.variants = []; empty.profiles = []; empty.sources = [];
    empty.cardPrintings = []; empty.cardCatalog = null; empty.releases = [];
    intercept = ({ requestId }) => call('Fetch.fulfillRequest', { requestId, responseCode: 200, body: Buffer.from(JSON.stringify(empty)).toString('base64') });
    await navigate('/baku/bakugan-archive/', "Boolean(document.querySelector('.empty-state'))");
    assert.equal(await evaluate("document.querySelector('.empty-state h2').textContent"), 'The catalog is empty.');
    await call('Fetch.disable'); intercept = null;
    passed('valid empty catalog state');

    // Synthetic metadata/photos exercise future reviewed entries without publishing them.
    const evidenceFixture = JSON.parse(await readFile(join(root, 'baku/bakugan-archive/data/toys.json'), 'utf8'));
    for (const variant of evidenceFixture.variants) variant.evidence = { sourceId: variant.evidence.sourceId, locator: variant.evidence.locator, reviewStatus: 'source-transcribed' };
    for (const variant of evidenceFixture.variants) variant.releaseIds = [];
    evidenceFixture.releases = [];
    for (const profile of evidenceFixture.profiles) { profile.compatibility = 'unverified'; profile.bakuCores = null; profile.cardPrintingIds = []; delete profile.linkEvidence; }
    evidenceFixture.cardPrintings = []; evidenceFixture.cardCatalog = null;
    const sourceFixture = evidenceFixture.sources.find((source) => source.id === evidenceFixture.variants[0].evidence.sourceId);
    Object.assign(sourceFixture, { revision: 202, pageId: 101, sourceTimestamp: '2026-11-20T12:00:00Z', capturedAt: '2026-11-22T12:00:00Z', captureMethod: 'browser-api', sourceSha256: 'a'.repeat(64) });
    Object.assign(evidenceFixture.variants[0].evidence, { reviewStatus: 'revision-reviewed', sourceRevision: 202, sourceSha256: 'a'.repeat(64), reviewer: 'Synthetic browser fixture', reviewedAt: '2026-11-22' });
    evidenceFixture.variants[0].image = { url: `${origin}/smoke-photo.svg`, sourceUrl: `${origin}/photo-source`, rightsUrl: `${origin}/photo-rights`, credit: 'Synthetic photographer', rights: 'Test fixture only', view: 'open', width: 80, height: 60 };
    let failPhoto = false;
    await call('Fetch.enable', { patterns: [{ urlPattern: '*data/toys.json*', requestStage: 'Request' }, { urlPattern: '*smoke-photo.svg*', requestStage: 'Request' }] });
    intercept = ({ requestId, request }) => {
        if (request.url.includes('/smoke-photo.svg')) return failPhoto
            ? call('Fetch.failRequest', { requestId, errorReason: 'Failed' })
            : call('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'image/svg+xml' }], body: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="60"><rect width="80" height="60" fill="navy"/></svg>').toString('base64') });
        return call('Fetch.fulfillRequest', { requestId, responseCode: 200, body: Buffer.from(JSON.stringify(evidenceFixture)).toString('base64') });
    };
    await navigate('/baku/bakugan-archive/?item=toy-0001', "Boolean(document.querySelector('dialog')?.open)");
    await until(() => evaluate("Boolean(document.querySelector('dialog img')?.naturalWidth)"), 'reviewed photo loaded');
    assert.match(await evaluate("document.querySelector('dialog').textContent"), /Catalog facts reviewed against the captured revision/);
    assert.equal(await evaluate("document.querySelector('dialog a[href*=oldid]').href.includes('oldid=202')"), true);
    assert.match(await evaluate("document.querySelector('dialog figcaption').textContent"), /Synthetic photographer/);
    assert.ok(await evaluate("[...document.querySelectorAll('dialog a[target=_blank]')].every(link => link.rel === 'noopener noreferrer')"));
    passed('captured-revision status, photo dimensions, credit and safe source/rights links');
    await navigate('/baku/bakugan-archive/?item=toy-0002', "Boolean(document.querySelector('dialog')?.open)");
    assert.match(await evaluate("document.querySelector('dialog').textContent"), /facts have not yet been reviewed/);
    assert.match(await evaluate("document.querySelector('dialog').textContent"), /Source revision 202/);
    passed('captured tables still show pending status for unreviewed variants');
    await navigate('/baku/bakugan-archive/?item=toy-0043', "Boolean(document.querySelector('dialog')?.open)");
    assert.match(await evaluate("document.querySelector('dialog').textContent"), /Not yet verified/);
    assert.match(await evaluate("document.querySelector('dialog').textContent"), /Not yet recorded/);
    assert.equal(await evaluate("Boolean(document.querySelector('dialog a[href*=bakugan_card_archive]'))"), false);
    passed('unmatched profiles retain unknown cores and pending card compatibility');
    await navigate('/baku/bakugan-archive/?q=Delta+Dragonoid'); await readyCatalog();
    assert.match(await evaluate("document.querySelector('.toy-photo figcaption').textContent"), /Example variant: Pyrus Delta Dragonoid/);
    await choose('faction', 'Aquos');
    assert.equal(await evaluate("document.querySelectorAll('.toy-photo').length"), 0);
    passed('mold photos identify an example variant and respect faction filters');
    failPhoto = true;
    evidenceFixture.variants[0].image.url += '?broken=1';
    await navigate('/baku/bakugan-archive/?item=toy-0001', "Boolean(document.querySelector('dialog')?.open)");
    await until(() => evaluate("Boolean(document.querySelector('dialog .toy-photo .image-placeholder'))"), 'failed photo fallback');
    assert.match(await evaluate("document.querySelector('dialog figcaption').textContent"), /Synthetic photographer/);
    await call('Fetch.disable'); intercept = null;
    passed('failed identification photo keeps its fallback and attribution');

    await navigate('/baku/bakugan-archive/'); await readyCatalog();
    await evaluate("window.dispatchEvent(new PageTransitionEvent('pagehide'))");
    for (let index = 0; index < 3; index++) {
        await evaluate("(async () => { const module = await import('./scripts/app.js'); window.smokeCleanup = module.mount(document.getElementById('catalog')); })()");
        await readyCatalog();
        await evaluate("window.smokeCleanup(); document.title = 'Cleanup sentinel'; window.dispatchEvent(new PopStateEvent('popstate'))");
        assert.equal(await evaluate("document.getElementById('catalog').childElementCount"), 0);
        assert.equal(await evaluate('document.title'), 'Cleanup sentinel');
    }
    passed('three mount/cleanup cycles leave no reacting listeners or content');

    // Synthetic legacy collection in this isolated browser profile only.
    await navigate('/baku');
    const legacyKey = 'bakugan-card-archive.collection.v1', sharedKey = 'bakugan-suite.inventory.v2';
    const legacy = JSON.stringify({ schemaVersion: 1, items: { 'wiki-279791': { quantity: 5, name: 'Aquos Hydorous Ultra' }, 'wiki-99999999': { quantity: 2, name: 'Unmatched fixture' } } });
    await evaluate(`localStorage.setItem(${JSON.stringify(legacyKey)}, ${JSON.stringify(legacy)}); localStorage.removeItem(${JSON.stringify(sharedKey)})`);
    await evaluate("document.querySelector('.project-grid a[href=\"/baku/collection\"]').click()"); await readyCollection();
    assert.equal(await evaluate('location.pathname'), '/baku/collection/');
    assert.equal(await evaluate("document.querySelector('h1').textContent"), 'Bakugan Collection Manager');
    assert.equal(await evaluate("document.querySelector('meta[name=robots]').content"), 'noindex,follow');
    assert.deepEqual(await archiveTheme(), cardTheme);
    assert.match(await evaluate("document.querySelector('[aria-label=\"Local storage and migration\"]').textContent"), /2 legacy card entries, 7 owned copies.*1 unmatched/);
    assert.equal(await evaluate(`localStorage.getItem(${JSON.stringify(sharedKey)})`), null);
    await evaluate("document.querySelector('[data-action=activate]').click()");
    await until(() => evaluate(`Boolean(localStorage.getItem(${JSON.stringify(sharedKey)}))`), 'explicit shared migration');
    assert.equal(await evaluate(`localStorage.getItem(${JSON.stringify(legacyKey)})`), legacy);
    assert.equal(await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(sharedKey)})).items.length`), 2);
    passed('collection manager route, shared theme, migration preview, activation and original legacy preservation');

    await navigate('/baku/collection/?kind=toy&item=toy-0001'); await readyCollection();
    assert.match(await evaluate("document.querySelector('#inventory-result-count').textContent"), /^1 matching items/);
    await evaluate("(() => { const f=document.querySelector('form[data-form=quantities]'); f.elements.owned.value='2'; f.elements.wanted.value='3'; f.elements.offered.value='1'; f.elements.notes.value='Private fixture note'; f.requestSubmit(); })()");
    const sharedItem = (key) => `JSON.parse(localStorage.getItem(${JSON.stringify(sharedKey)})).items.find(item => item.key === ${JSON.stringify(key)})`;
    await until(() => evaluate(`${sharedItem('toy:toy-0001')}?.owned === 2`), 'toy ownership saved');
    assert.deepEqual(await evaluate(`(() => { const i=${sharedItem('toy:toy-0001')}; return [i.owned,i.wanted,i.offered,i.notes]; })()`), [2, 3, 1, 'Private fixture note']);
    for (const [index, name] of ['Trade binder', 'Wishlist binder'].entries()) {
        await evaluate(`(() => { const f=document.querySelector('form[data-form=create-binder]'); f.elements.name.value=${JSON.stringify(name)}; f.requestSubmit(); })()`);
        await until(() => evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(sharedKey)})).binders.length === ${index + 1}`), 'binder created');
        await until(() => evaluate("!document.querySelector('[data-action=add-member]').disabled"), 'binder controls ready');
        await evaluate(`(() => { const f=document.querySelector('form[data-form=quantities]'); f.elements.binderTarget.value=JSON.parse(localStorage.getItem(${JSON.stringify(sharedKey)})).binders[${index}].id; f.querySelector('[data-action=add-member]').click(); })()`);
        await until(() => evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(sharedKey)})).binders[${index}].entries.includes('toy:toy-0001')`), 'binder membership saved');
    }
    assert.equal(await evaluate(`${sharedItem('toy:toy-0001')}.owned`), 2);
    await evaluate("document.getElementById('inventory-status').value='offered'; document.getElementById('inventory-status').dispatchEvent(new Event('change',{bubbles:true}))");
    assert.match(await evaluate("document.querySelector('#inventory-result-count').textContent"), /^1 matching items/);
    await call('Page.reload'); await readyCollection();
    assert.equal(await evaluate("document.querySelector('form[data-form=quantities] input[name=owned]').value"), '2');
    passed('independent toy ownership, wants, trade offers and multiple binder memberships persist on refresh');

    await navigate('/baku/collection/?kind=card&item=wiki-279791'); await readyCollection();
    await evaluate("(() => { const f=document.querySelector('form[data-form=quantities]'); f.elements.wanted.value='2'; f.elements.offered.value='2'; f.requestSubmit(); })()");
    await until(() => evaluate(`${sharedItem('card:wiki-279791')}?.offered === 2`), 'card offers saved');
    await navigate('/baku/bakugan_card_archive/?q=wiki-279791', "document.querySelectorAll('#card-grid .card-result').length === 1");
    assert.match(await evaluate("document.getElementById('collection-summary').textContent"), /Shared inventory/);
    await evaluate("document.querySelector('#card-grid .card-result').click()");
    await evaluate("(() => { const f=document.querySelector('#card-dialog .collection-edit'); f.querySelector('input').value='6'; f.requestSubmit(); })()");
    await until(() => evaluate(`${sharedItem('card:wiki-279791')}?.owned === 6`), 'card archive shared ownership saved');
    assert.deepEqual(await evaluate(`(() => {const i=${sharedItem('card:wiki-279791')};return [i.owned,i.wanted,i.offered]})()`), [6, 2, 2]);
    assert.equal(await evaluate(`${sharedItem('toy:toy-0001')}.owned`), 2);
    assert.equal(await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(sharedKey)})).binders.length`), 2);
    assert.equal(await evaluate(`localStorage.getItem(${JSON.stringify(legacyKey)})`), legacy);
    await evaluate("(() => { const f=document.querySelector('#card-dialog .collection-edit'); f.querySelector('input').value='1'; f.requestSubmit(); })()");
    await until(() => evaluate("document.querySelector('#card-dialog .collection-edit-note').textContent.includes('Offered quantity cannot exceed owned')"), 'card ownership cannot invalidate offers');
    assert.equal(await evaluate(`${sharedItem('card:wiki-279791')}.owned`), 6);
    passed('Card Archive adopts shared ownership without erasing toys, wants, offers, binders or legacy backup');

    await navigate('/baku/bakugan-archive/?item=toy-0001', "Boolean(document.querySelector('dialog')?.open)");
    assert.equal(await evaluate("document.querySelector('dialog a[href*=\"/baku/collection/\"]').getAttribute('href')"), '/baku/collection/?kind=toy&item=toy-0001');
    await evaluate("document.querySelector('dialog a[href*=\"/baku/collection/\"]').click()"); await readyCollection();
    assert.equal(await evaluate("document.querySelector('form[data-form=quantities] input[name=owned]').value"), '2');
    await evaluate('history.back()'); await until(() => evaluate("location.pathname === '/baku/bakugan-archive/' && Boolean(document.querySelector('dialog')?.open)"), 'Back restores exact toy variant');
    passed('exact toy variant handoff and Back navigation preserve shared quantities');

    await navigate('/baku/collection/?kind=toy&item=toy-0001'); await readyCollection();
    const beforeImport = await evaluate(`localStorage.getItem(${JSON.stringify(sharedKey)})`);
    await evaluate(`(() => { const data=JSON.parse(localStorage.getItem(${JSON.stringify(sharedKey)})); const item=data.items.find(v=>v.key==='toy:toy-0001'); item.owned=1;item.wanted=4;item.offered=0; const transfer=new DataTransfer();transfer.items.add(new File([JSON.stringify(data)],'synthetic.json',{type:'application/json'}));const input=document.getElementById('inventory-import-file');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await until(() => evaluate("Boolean(document.querySelector('dialog[open] #inventory-import-heading'))"), 'backup preview');
    assert.equal(await evaluate(`localStorage.getItem(${JSON.stringify(sharedKey)})`), beforeImport);
    await evaluate("document.querySelector('[data-action=confirm-import]').click()");
    await until(() => evaluate(`${sharedItem('toy:toy-0001')}?.wanted === 4`), 'maximum merge applied');
    assert.deepEqual(await evaluate(`(() => {const i=${sharedItem('toy:toy-0001')};return [i.owned,i.wanted,i.offered,i.notes]})()`), [2, 4, 1, 'Private fixture note']);
    passed('backup preview does not mutate inventory; confirmed merge uses maximum quantities');

    await navigate('/baku/collection/'); await readyCollection();
    const selectionCount = () => evaluate("document.querySelector('.inventory-selection-count').textContent");
    await evaluate("document.querySelector('[data-action=select-page]').click()");
    assert.match(await selectionCount(), /^24 selected/);
    await evaluate("document.querySelector('[data-action=next]').click()");
    assert.match(await selectionCount(), /^24 selected/);
    await evaluate("document.querySelector('[data-action=select-page]').click()");
    assert.match(await selectionCount(), /^48 selected/);
    await evaluate("document.querySelector('[data-action=select-all]').click()");
    assert.ok(await evaluate("(() => {const m=document.querySelector('.inventory-selection-count').textContent.match(/([\\d,]+) selected of ([\\d,]+)/); return m[1]===m[2] && Number(m[1].replaceAll(',',''))>48})()"));
    await evaluate("document.getElementById('inventory-view').value='gallery';document.getElementById('inventory-view').dispatchEvent(new Event('change',{bubbles:true}))");
    assert.ok(await evaluate("[...document.querySelectorAll('[data-select-key]')].every(input=>input.checked)"));
    await evaluate("document.getElementById('inventory-status').value='owned';document.getElementById('inventory-status').dispatchEvent(new Event('change',{bubbles:true}))");
    assert.match(await selectionCount(), /^0 selected of 3/);
    passed('bulk selection persists across pages and layouts, supports all matches, and resets on scope changes');

    const setBulk = (field, mode, amount) => evaluate(`(() => {const form=document.querySelector('form[data-form=bulk]');form.elements.operation.value=${JSON.stringify(field)};form.elements.operation.dispatchEvent(new Event('change',{bubbles:true}));form.elements.mode.value=${JSON.stringify(mode)};form.elements.amount.value=${JSON.stringify(String(amount))};form.requestSubmit()})()`);
    const rawInventory = () => evaluate(`localStorage.getItem(${JSON.stringify(sharedKey)})`);
    await evaluate("document.querySelector('[data-action=select-all]').click()");
    const beforeBulk = await rawInventory();
    await setBulk('owned', 'set', 0);
    assert.match(await evaluate("document.getElementById('inventory-notice').textContent"), /offered quantity cannot exceed owned/);
    assert.equal(await rawInventory(), beforeBulk);
    await setBulk('wanted', 'increase', 1);
    await until(() => evaluate("Boolean(document.querySelector('dialog[open] #bulk-preview-heading'))"), 'bulk preview shown');
    assert.match(await evaluate("document.querySelector('dialog[open]').textContent"), /3 of 3 selected items will change/);
    assert.equal(await rawInventory(), beforeBulk);
    await evaluate("document.querySelector('dialog[open] [data-action=cancel-bulk]').click()");
    assert.equal(await rawInventory(), beforeBulk);
    await setBulk('wanted', 'increase', 1);
    await evaluate(`(() => {const key=${JSON.stringify(sharedKey)}, oldValue=localStorage.getItem(key), changed=JSON.parse(oldValue);changed.revision++;const newValue=JSON.stringify(changed);localStorage.setItem(key,newValue);window.dispatchEvent(new StorageEvent('storage',{key,oldValue,newValue}));})()`);
    const updated = await rawInventory();
    await evaluate("document.querySelector('[data-action=confirm-bulk]').click()");
    assert.match(await evaluate("document.getElementById('inventory-notice').textContent"), /changed after the bulk preview/);
    assert.equal(await rawInventory(), updated);
    await setBulk('wanted', 'increase', 1);
    await evaluate(`(() => {const key=${JSON.stringify(sharedKey)},changed=JSON.parse(localStorage.getItem(key));changed.revision++;localStorage.setItem(key,JSON.stringify(changed));})()`);
    const intervening = await rawInventory();
    await evaluate("document.querySelector('[data-action=confirm-bulk]').click()");
    await until(() => evaluate("Boolean(document.querySelector('dialog[open] [role=alert]'))"), 'transaction conflict visible in preview');
    assert.match(await evaluate("document.querySelector('dialog[open] [role=alert]').textContent"), /changed in another tab/);
    assert.equal(await rawInventory(), intervening);
    await evaluate("document.querySelector('dialog[open] [data-action=cancel-bulk]').click()");
    await setBulk('wanted', 'increase', 1);
    await evaluate("document.querySelector('[data-action=confirm-bulk]').click()");
    await until(() => evaluate(`${sharedItem('toy:toy-0001')}?.wanted === 5 && !document.querySelector('dialog[open]')`), 'bulk quantity saved');
    assert.equal(await evaluate(`${sharedItem('card:wiki-279791')}.wanted`), 3);
    assert.equal(await evaluate(`${sharedItem('card:wiki-99999999')}.wanted`), 1);
    assert.equal(await evaluate(`${sharedItem('toy:toy-0001')}.notes`), 'Private fixture note');
    assert.match(await selectionCount(), /^0 selected/);
    passed('bulk preview is non-mutating, rejects excess offers and stale previews, and commits all selected changes together');

    await evaluate("document.querySelector('[data-action=select-all]').click()");
    await evaluate(`(() => {const f=document.querySelector('form[data-form=bulk]');f.elements.operation.value='add';f.elements.operation.dispatchEvent(new Event('change',{bubbles:true}));f.elements.binder.value=JSON.parse(localStorage.getItem(${JSON.stringify(sharedKey)})).binders[0].id;f.elements.binder.dispatchEvent(new Event('change',{bubbles:true}));f.requestSubmit()})()`);
    assert.match(await evaluate("document.querySelector('dialog[open]').textContent"), /2 of 3 selected items will change/);
    await evaluate("document.querySelector('[data-action=confirm-bulk]').click()");
    await until(() => evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(sharedKey)})).binders[0].entries.length === 3 && !document.querySelector('dialog[open]')`), 'bulk binder add saved');
    await evaluate("document.querySelector('.binder-cover [data-action=open-binder]').click()");
    assert.equal(await evaluate("document.querySelector('.inventory-results').dataset.view"), 'gallery');
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.collection-manager .search-shell')).position"), 'static');
    assert.match(await evaluate("document.querySelector('.binder-cover[data-selected=true]').textContent"), /3 entries · 10 owned/);
    assert.equal(await evaluate("document.querySelector('.inventory-results article').dataset.key"), 'toy:toy-0001');
    await evaluate("document.querySelector('.inventory-results article [data-action=move-down]').click()");
    await until(() => evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(sharedKey)})).binders[0].entries[1] === 'toy:toy-0001' && document.querySelector('.inventory-results article:nth-child(2)').dataset.key === 'toy:toy-0001'`), 'gallery order persisted');
    await evaluate("document.querySelector('.inventory-results article[data-key=\"toy:toy-0001\"] [data-action=remove-member]').click()");
    await until(() => evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(sharedKey)})).binders[0].entries.length === 2`), 'gallery removal saved');
    assert.equal(await evaluate(`${sharedItem('toy:toy-0001')}.owned`), 2);
    assert.equal(await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(sharedKey)})).binders[1].entries[0]`), 'toy:toy-0001');
    passed('visual binder covers, ordered gallery and bulk membership preserve inventory and other binders');

    await navigate('/baku/bakugan-archive/'); await readyCatalog();
    await call('Emulation.setDeviceMetricsOverride', { width: 320, height: 800, deviceScaleFactor: 1, mobile: true });
    await call('Page.reload'); await readyCatalog();
    assert.equal(await evaluate("document.querySelector('.filter-details').open"), false);
    await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'));
    assert.equal(await evaluate("getComputedStyle(document.documentElement).scrollBehavior"), 'auto');
    await call('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'active' }] });
    assert.equal(await evaluate("matchMedia('(forced-colors: active)').matches"), true);
    await call('Emulation.setEmulatedMedia', { features: [] });
    await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    const output = join(import.meta.dirname, '..', '..', 'test-results');
    await mkdir(output, { recursive: true });
    const screenshot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(join(output, 'toy-pilot-mobile.png'), Buffer.from(screenshot.data, 'base64'));
    await navigate('/baku/bakugan-archive/?item=toy-0043', "Boolean(document.querySelector('dialog')?.open)");
    assert.ok(await evaluate("document.querySelector('dialog').scrollWidth <= document.querySelector('dialog').clientWidth + 1"));
    assert.match(await evaluate("document.querySelector('dialog').textContent"), /Shield \+ Shield/);
    await evaluate("document.querySelector('dialog a[href*=bakugan_card_archive]').scrollIntoView({ block: 'center' })");
    assert.ok(await evaluate("(() => { const rect = document.querySelector('dialog a[href*=bakugan_card_archive]').getBoundingClientRect(); return rect.top >= 0 && rect.bottom <= innerHeight; })()"));
    const mobileProfile = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(join(output, 'toy-pilot-mobile-profile.png'), Buffer.from(mobileProfile.data, 'base64'));
    passed('320px profile dialog retains paired cores and readable card links without horizontal scrolling');
    await navigate('/baku/bakugan-archive/?item=toy-0742', "Boolean(document.querySelector('dialog')?.open)");
    assert.ok(await evaluate("document.querySelector('dialog').scrollWidth <= document.querySelector('dialog').clientWidth + 1"));
    assert.match(await evaluate("document.querySelector('dialog').textContent"), /Listed attribute wheelAquos \/ Subterra \/ Ventus/);
    assert.match(await evaluate("document.querySelector('dialog').textContent"), /S\/S\/B2-TX mark/);
    passed('320px legacy detail preserves wheel and physical-mark text without horizontal scrolling');
    await navigate('/baku/collection/?kind=toy&item=toy-0001'); await readyCollection();
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'));
    assert.equal(await evaluate("document.querySelector('form[data-form=quantities] input[name=owned]').value"), '2');
    const collectionMobile = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(join(output, 'collection-mobile.png'), Buffer.from(collectionMobile.data, 'base64'));
    passed('320px shared collection layout and quantity editor remain usable');
    await evaluate("document.querySelector('.binder-cover [data-action=open-binder]').click()");
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'));
    await evaluate("document.querySelector('[data-action=select-all]').click()");
    await setBulk('wanted', 'set', 2);
    assert.ok(await evaluate("document.querySelector('dialog[open]').scrollWidth <= document.querySelector('dialog[open]').clientWidth + 1"));
    const bulkMobile = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(join(output, 'collection-bulk-mobile.png'), Buffer.from(bulkMobile.data, 'base64'));
    await evaluate("document.querySelector('dialog[open] [data-action=cancel-bulk]').click()");
    passed('320px visual binder and bulk preview fit the viewport');
    await call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await evaluate("document.querySelector('.binder-shelf').scrollIntoView({block:'center',behavior:'instant'});new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
    const binderDesktop = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(join(output, 'collection-binders-desktop.png'), Buffer.from(binderDesktop.data, 'base64'));
    await evaluate("document.querySelector('.inventory-results').scrollIntoView({block:'center',behavior:'instant'});new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
    const galleryDesktop = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(join(output, 'collection-gallery-desktop.png'), Buffer.from(galleryDesktop.data, 'base64'));
    await navigate('/baku/bakugan-archive/?item=toy-0742', "Boolean(document.querySelector('dialog')?.open)"); await readyCatalog();
    const desktop = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(join(output, 'toy-pilot-desktop.png'), Buffer.from(desktop.data, 'base64'));
    passed('320px layout, reduced motion, forced colors, desktop/mobile screenshots');

    // Account frontend fixture: all network responses are intercepted inside
    // the isolated browser profile. The real Worker is tested separately.
    await navigate('/baku/shared/');
    await until(() => evaluate("document.querySelector('#shared-list').textContent.includes('not configured yet')"), 'disabled share reader');
    assert.equal(await evaluate("document.querySelector('meta[name=robots]').content"), 'noindex,follow');
    assert.equal(await evaluate("document.querySelector('link[rel=canonical]').href"), 'https://donutcat.org/baku/shared/');
    assert.equal((await fetch(`${origin}/baku/collection/shared/`)).status, 404);
    passed('canonical static share route is noindex and safely disabled before service configuration');

    const alice = '11111111-1111-4111-8111-111111111111', bob = '22222222-2222-4222-8222-222222222222', shareId = '33333333-3333-4333-8333-333333333333';
    let signedIn = alice, loseReceipt = true, losePublicationReceipt = true, writes = [], publicationWrites = [], publications = new Map(), sessionCalls = 0;
    const heads = new Map([[alice,{revision:0,inventory:null}], [bob,{revision:1,inventory:{schemaVersion:2,revision:0,items:[{kind:'toy',id:'toy-b-private',key:'toy:toy-b-private',snapshot:{name:'BOB ONLY FIXTURE'},owned:1,wanted:0,offered:0,notes:'BOB PRIVATE NOTE'}],binders:[]}}]]);
    const receipts = new Map(), scopeEntries = (doc, scope) => {
        const byKey = new Map(doc.items.map(item => [item.key,item]));
        const source = scope.binderId ? doc.binders.find(binder=>binder.id===scope.binderId).entries.map(key=>byKey.get(key)) : doc.items;
        return source.filter(item=>item[scope.quantityField]>0).map(item=>({kind:item.kind,id:item.id,name:item.snapshot.name,...(item.snapshot.set ? {set:item.snapshot.set}:{}),...(item.snapshot.serial?{serial:item.snapshot.serial}:{}),quantity:item[scope.quantityField]}));
    };
    intercept = async ({ requestId, request }) => {
        const path = new URL(request.url).pathname;
        const respond = (value, responseCode=200) => call('Fetch.fulfillRequest', { requestId, responseCode, responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Cache-Control',value:'no-store'}], body:Buffer.from(JSON.stringify(value)).toString('base64') });
        if(path.endsWith('/data/service-config.json'))return respond({schemaVersion:1,apiOrigin:origin});
        if(path==='/v1/session'){sessionCalls++;return respond(signedIn?{signedIn:true,accountId:signedIn}:{signedIn:false});}
        if(path.startsWith('/v1/shared/')){const p=publications.get(path.split('/').at(-1));return respond(p&&!p.revoked?p.view:null);}
        if(!signedIn)return respond({error:'AUTH_REQUIRED'},401);
        const asserted=Object.entries(request.headers).find(([key])=>key.toLowerCase()==='x-bakugan-account')?.[1];
        if(asserted!==signedIn)return respond({error:'ACCOUNT_CHANGED'},409);
        const head=heads.get(signedIn), body=request.postData?JSON.parse(request.postData):null;
        if(path==='/v1/inventory'&&request.method==='GET')return respond(head);
        if(path==='/v1/inventory'&&request.method==='POST'){
            writes.push({account:signedIn,...structuredClone(body)});
            const prior=receipts.get(signedIn);if(prior?.id===body.mutationId)return respond({status:'replayed',revision:head.revision});
            if(body.expectedRevision!==head.revision)return respond({status:'conflict',revision:head.revision});
            const revision=head.revision+1;heads.set(signedIn,{revision,inventory:structuredClone(body.inventory)});receipts.set(signedIn,{id:body.mutationId});
            if(loseReceipt){loseReceipt=false;return respond({error:'UNAVAILABLE'},503);}
            return respond({status:'saved',revision});
        }
        if(path==='/v1/shares/preview')return body.expectedRevision===head.revision?respond({status:'preview',revision:head.revision,title:body.title,quantityField:body.quantityField,entries:scopeEntries(head.inventory,body)}):respond({status:'conflict',revision:head.revision});
        if(path==='/v1/shares'&&request.method==='POST'){
            publicationWrites.push(structuredClone(body));
            const previous=publications.get(shareId);if(previous?.requestId===body.requestId)return respond({status:'replayed',id:shareId});
            if(body.expectedRevision!==head.revision)return respond({status:'conflict',revision:head.revision});
            const view={id:shareId,title:body.title,quantityField:body.quantityField,createdAt:'2026-11-26T00:00:00Z',entries:scopeEntries(head.inventory,body)};
            publications.set(shareId,{owner:signedIn,view,sourceRevision:head.revision,revoked:false,requestId:body.requestId});
            if(losePublicationReceipt){losePublicationReceipt=false;return respond({error:'UNAVAILABLE'},503);}
            return respond({status:'created',id:shareId});
        }
        if(path==='/v1/shares'&&request.method==='GET')return respond([...publications.values()].filter(p=>p.owner===signedIn&&!p.revoked).map(p=>({id:p.view.id,title:p.view.title,quantityField:p.view.quantityField,createdAt:p.view.createdAt,sourceRevision:p.sourceRevision,entryCount:p.view.entries.length})));
        if(path.endsWith('/revoke')){const p=publications.get(path.split('/')[3]);if(p?.owner===signedIn){p.revoked=true;return respond(true);}return respond(false);}
        if(path==='/v1/auth/logout'){signedIn=null;return respond({signedIn:false});}
        return respond({error:'NOT_FOUND'},404);
    };
    await call('Fetch.enable',{patterns:[{urlPattern:'*data/service-config.json*',requestStage:'Request'},{urlPattern:`${origin}/v1/*`,requestStage:'Request'}]});
    const accountButton = action => evaluate(`document.querySelector('.collection-account-panel [data-action=${JSON.stringify(action)}]')?.click()`);
    const accountText = () => evaluate("document.querySelector('.collection-account-panel').textContent");
    const readyAccount = async () => { await until(()=>evaluate("Boolean(document.querySelector('[aria-label=\"Account draft status\"]')) && !document.querySelector('.collection-workspace').hidden"),'account workspace visible'); await readyCollection(); };
    await navigate('/baku/collection/?kind=toy&item=toy-0001'); await readyCollection();
    const guestBefore = await rawInventory();
    await until(()=>evaluate("Boolean(document.querySelector('[data-action=open-account]'))"),'signed-in guest controls');
    assert.equal(writes.length,0); assert.equal(heads.get(alice).revision,0);
    await accountButton('open-account'); await readyAccount();
    assert.equal(await evaluate("document.querySelector('form[data-form=quantities] input[name=owned]').value"),'0');
    await accountButton('copy-guest'); assert.match(await evaluate("document.querySelector('dialog[open]').textContent"),/Guest: .* Account draft:/);
    assert.equal(writes.length,0); await accountButton('confirm-account-dialog'); await readyAccount();
    assert.match(await accountText(),/Unsynced account draft/); assert.equal(await evaluate("document.querySelector('form[data-form=quantities] input[name=owned]').value"),'2');
    assert.equal(await rawInventory(),guestBefore); assert.equal(writes.length,0);
    await accountButton('sync'); await until(()=>evaluate("document.querySelector('.collection-account-panel').textContent.includes('save result is uncertain')"),'uncertain account receipt');
    assert.equal(writes.length,1); assert.equal(heads.get(alice).revision,1);
    await accountButton('sync'); await until(()=>evaluate("document.querySelector('.account-sync-state')?.textContent.includes('server revision 1')"),'replayed account receipt');
    assert.deepEqual(writes[0],writes[1]); assert.equal(await rawInventory(),guestBefore);
    passed('sign-in never uploads guest data; explicit adoption and exact sync retry preserve the independent guest inventory');

    await evaluate("(() => {const f=document.querySelector('form[data-form=quantities]');f.elements.owned.value='3';f.requestSubmit()})()");
    await until(()=>evaluate("document.querySelector('.account-sync-state')?.textContent.includes('Unsynced')"),'account edit draft');
    const incoming=structuredClone(heads.get(alice));incoming.revision++;incoming.inventory.items.find(item=>item.key==='toy:toy-0001').owned=6;incoming.inventory.items.find(item=>item.key==='toy:toy-0001').notes='ALICE PRIVATE ONLY';heads.set(alice,incoming);
    await accountButton('sync');await until(()=>evaluate("Boolean(document.querySelector('[data-action=resolve-conflict]'))"),'conflict loaded');
    await accountButton('resolve-conflict');assert.match(await evaluate("document.querySelector('dialog[open]').textContent"),/Remote revision 2/);
    await evaluate("(() => {const s=document.querySelector('dialog[open] select');s.value='merge';s.dispatchEvent(new Event('change',{bubbles:true}))})()");
    await accountButton('confirm-account-dialog');await readyAccount();
    assert.equal(await evaluate("document.querySelector('form[data-form=quantities] input[name=owned]').value"),'6');assert.equal(heads.get(alice).revision,2);
    await accountButton('sync');await until(()=>evaluate("document.querySelector('.account-sync-state')?.textContent.includes('server revision 3')"),'resolved account synced');
    assert.equal(heads.get(alice).inventory.items.find(item=>item.key==='toy:toy-0001').notes,'ALICE PRIVATE ONLY');assert.equal(await rawInventory(),guestBefore);
    passed('conflict retains the account draft and explicit maximum-merge preview does not auto-overwrite the remote version');

    await evaluate("(() => {const f=document.querySelector('[data-account-form=share]');f.elements['share-field'].value='offered';f.elements['share-title'].value='Trade <img src=x onerror=alert(1)>';f.requestSubmit()})()");
    await until(()=>evaluate("document.querySelector('dialog[open] #account-dialog-title')?.textContent==='Preview unlisted publication'"),'server publication preview');
    assert.equal(publications.size,0);assert.match(await evaluate("document.querySelector('dialog[open]').textContent"),/Trade <img src=x/);
    await accountButton('confirm-account-dialog');await until(()=>evaluate("Boolean(document.querySelector('dialog[open] [data-publication-error]')) && !document.querySelector('dialog[open] [data-action=confirm-account-dialog]').disabled"),'uncertain share receipt visible');
    assert.equal(publications.size,1);
    await accountButton('confirm-account-dialog');await until(()=>evaluate("Boolean(document.querySelector('.account-share-link a'))"),'published link displayed');
    assert.deepEqual(publicationWrites[0],publicationWrites[1]);
    assert.equal(publications.size,1);assert.doesNotMatch(JSON.stringify(publications.get(shareId).view),/ALICE PRIVATE|Private fixture note/);
    await call('Emulation.setDeviceMetricsOverride',{width:320,height:800,deviceScaleFactor:1,mobile:true});
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
    await call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
    await evaluate("document.querySelector('.collection-account-panel').scrollIntoView({block:'start',behavior:'instant'})");
    const accountScreenshot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(output,'collection-account-desktop.png'),Buffer.from(accountScreenshot.data,'base64'));
    await evaluate("document.querySelector('.account-share-link a').click()");
    await until(()=>evaluate("location.pathname==='/baku/shared/' && document.querySelector('.shared-entry')"),'anonymous shared list read');
    assert.match(await evaluate("document.querySelector('[aria-label=\"Published list\"] h2').textContent"),/Trade <img src=x/);
    assert.equal(await evaluate("document.querySelectorAll('.shared-reader img[onerror]').length"),0);
    assert.doesNotMatch(await evaluate("document.querySelector('.shared-reader').textContent"),/ALICE PRIVATE|Private fixture note/);
    await evaluate("(() => {const f=document.querySelector('[aria-label=\"Open shared link\"]');f.elements.link.value='44444444-4444-4444-8444-444444444444';f.requestSubmit()})()");
    await until(()=>evaluate("document.querySelector('#shared-list').textContent.includes('List unavailable')"),'unknown share link recovery');
    await evaluate('history.back()');await until(()=>evaluate("Boolean(document.querySelector('.shared-entry'))"),'Back restores previous shared snapshot');
    await evaluate('history.forward()');await until(()=>evaluate("document.querySelector('#shared-list').textContent.includes('List unavailable')"),'Forward restores unavailable share');
    await evaluate('history.back()');await until(()=>evaluate("Boolean(document.querySelector('.shared-entry'))"),'Back restores valid snapshot again');
    await call('Emulation.setDeviceMetricsOverride',{width:320,height:800,deviceScaleFactor:1,mobile:true});
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
    await evaluate("document.querySelector('[aria-label=\"Published list\"]').scrollIntoView({block:'start',behavior:'instant'})");
    const sharedScreenshot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(output,'collection-shared-mobile.png'),Buffer.from(sharedScreenshot.data,'base64'));
    await call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
    passed('explicit share preview and publish produce a safe anonymous read-only list, including 320px layout');

    await navigate('/baku/collection/?kind=toy&item=toy-0001');await readyCollection();await until(()=>evaluate("Boolean(document.querySelector('[data-action=open-account]'))"),'account controls after navigation');
    await accountButton('open-account');await readyAccount();await accountButton('load-shares');await until(()=>evaluate("Boolean(document.querySelector('[data-action=revoke-share]'))"),'active share listed');
    await accountButton('revoke-share');await accountButton('confirm-account-dialog');await until(()=>publications.get(shareId).revoked,'share revoked');
    await until(()=>evaluate("!document.querySelector('dialog[open]')"),'revocation dialog closed');
    await navigate(`/baku/shared/?id=${shareId}`);await until(()=>evaluate("document.querySelector('#shared-list').textContent.includes('List unavailable')"),'revoked reader unavailable');
    passed('owner revocation removes the public snapshot from future reads');

    await navigate('/baku/collection/?kind=toy&item=toy-0001');await readyCollection();await until(()=>evaluate("Boolean(document.querySelector('[data-action=open-account]'))"),'account controls');await accountButton('open-account');await readyAccount();
    assert.equal(await evaluate("document.querySelector('form[data-form=quantities] textarea').value"),'ALICE PRIVATE ONLY');
    signedIn=bob;await evaluate("(() => {const c=new BroadcastChannel('bakugan-suite.account.v1');c.postMessage('session-changed');c.close()})()");
    await until(()=>evaluate("Boolean(document.querySelector('[aria-label=\"Local storage and migration\"]')) && Boolean(document.querySelector('[data-action=open-account]'))"),'account change resets guest workspace');
    assert.equal(await rawInventory(),guestBefore); assert.equal(await evaluate("[...document.querySelectorAll('textarea')].some(t=>t.value==='ALICE PRIVATE ONLY')"),false);
    await accountButton('open-account');await readyAccount();
    assert.equal(await evaluate("document.querySelector('form[data-form=quantities] input[name=owned]').value"),'0');
    await evaluate("(() => {const f=document.querySelector('form[data-form=quantities]');f.elements.owned.value='1';f.requestSubmit()})()");
    await until(()=>evaluate("document.querySelector('.account-sync-state')?.textContent.includes('Unsynced')"),'second account draft');
    const savedAlice=JSON.stringify(heads.get(alice));signedIn=alice;await accountButton('sync');
    await until(()=>evaluate("Boolean(document.querySelector('[aria-label=\"Local storage and migration\"]')) && Boolean(document.querySelector('[data-action=open-account]'))"),'stale account mutation rejected');
    assert.equal(JSON.stringify(heads.get(alice)),savedAlice);assert.equal(await rawInventory(),guestBefore);
    assert.ok(sessionCalls>2);
    await accountButton('sign-out');await until(()=>evaluate("document.querySelector('.collection-account-panel').textContent.includes('Sign in with Discord')"),'signed out');
    passed('account switching and stale-session mutation assertions clear the prior private workspace without altering guest data');
    await call('Fetch.disable');intercept=null;

    // Deckbuilder uses the actual pinned catalogs and the same isolated guest
    // inventory. The saved library is synthetic and exists only in this profile.
    await navigate('/baku');await evaluate("document.querySelector('.project-grid a[href=\"/baku/deckbuilder\"]').click()");
    await until(()=>evaluate("location.pathname==='/baku/deckbuilder/' && document.querySelector('[aria-label=\"Catalog status\"]')?.textContent.includes('979 toy variants')"),'deckbuilder catalog loaded');
    assert.equal(await evaluate("document.querySelector('h1').textContent"),'Bakugan Deckbuilder');assert.equal(await evaluate("document.querySelector('meta[name=robots]').content"),'noindex,follow');
    const deckKey='bakugan-suite.decks.v1';const savedLibrary=()=>evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(deckKey)}))`);
    const activeDeck=async()=>{const lib=await savedLibrary();return lib?.decks.find(deck=>deck.id===lib.activeId);};
    const deckState=()=>evaluate("document.querySelector('.deck-check-status')?.dataset.state");
    const deckButton=action=>evaluate(`document.querySelector('#deckbuilder [data-action=${JSON.stringify(action)}]')?.click()`);
    const deckSave=async action=>{const before=(await savedLibrary())?.revision||0;await action();await until(async()=>((await savedLibrary())?.revision||0)>before,'deck autosave');await until(()=>evaluate("!document.querySelector('[data-form=create] button').disabled"),'deck save controls ready');};
    const createDeckUI=(title,profile)=>deckSave(()=>evaluate(`(() => {const f=document.querySelector('form[data-form=create]');f.elements.title.value=${JSON.stringify(title)};f.elements.format.value=${JSON.stringify(profile)};f.requestSubmit()})()`));
    const browseDeck=async zone=>evaluate(`(() => {const s=document.getElementById('deck-add-zone');s.value=${JSON.stringify(zone)};s.dispatchEvent(new Event('change',{bubbles:true}))})()`);
    async function addDeckItem(id){await evaluate(`(() => {const q=document.getElementById('deck-search');q.value=${JSON.stringify(id)};q.dispatchEvent(new Event('input',{bubbles:true}))})()`);await deckSave(()=>evaluate(`document.querySelector('.deck-results button[data-id=${JSON.stringify(id)}]').click()`));}
    await createDeckUI('G1 browser fixture','g1-nv-basic-v1');assert.deepEqual(await archiveTheme(),cardTheme);
    await browseDeck('team');for(const id of ['toy-0001','toy-0002','toy-0001'])await addDeckItem(id);
    await browseDeck('gate');for(const id of ['wiki-901','wiki-854','wiki-7905'])await addDeckItem(id);
    await browseDeck('ability');for(const id of ['wiki-866','wiki-293938','wiki-307937'])await addDeckItem(id);
    assert.equal(await deckState(),'checks-passed');assert.equal((await activeDeck()).team.length,3);assert.equal((await activeDeck()).cards.length,6);
    assert.match(await evaluate("document.querySelector('[aria-label=\"Deck analysis\"]').textContent"),/Gate card printed attribute bonuses/);assert.match(await evaluate("document.querySelector('[aria-label=\"Collection comparison\"]').textContent"),/Exact printing and variant quantities/);
    assert.equal(await rawInventory(),guestBefore);
    await deckSave(()=>evaluate("document.querySelector('[data-action=increase-card][data-id=\"wiki-901\"]').click()"));assert.equal(await deckState(),'incomplete');assert.match(await evaluate("document.querySelector('.deck-issues').textContent"),/one Gold frame/);
    await deckSave(()=>evaluate("document.querySelector('[data-action=decrease-card][data-id=\"wiki-901\"]').click()"));assert.equal(await deckState(),'checks-passed');
    await call('Page.reload');await until(()=>evaluate("document.querySelector('[aria-label=\"Catalog status\"]')?.textContent.includes('979 toy variants') && document.querySelector('.deck-check-status')"),'G1 saved reload');assert.equal(await deckState(),'checks-passed');
    passed('G1 draft saves exact physical variants and frame zones, checks Gate/Ability colors, restores on refresh and never writes inventory');

    await createDeckUI('G2 browser fixture','g2-bp-tcg-v1');await browseDeck('team');for(const id of ['toy-0019','toy-0020','toy-0043'])await addDeckItem(id);
    assert.match(await evaluate("document.querySelector('[aria-label=Team]').textContent"),/Shield \+ Shield/);
    await deckSave(()=>deckButton('auto-cores'));assert.deepEqual((await activeDeck()).cores,{Fist:2,'Flaming Fist':1,Shield:3,'Magic Shield':0,Helix:0});
    await browseDeck('deck');await addDeckItem('wiki-279263');
    await deckSave(()=>evaluate("(() => {const f=document.querySelector('form[data-form=quantity][data-id=\"wiki-279263\"]');f.elements.quantity.value='4';f.requestSubmit()})()"));assert.match(await evaluate("document.querySelector('.deck-issues').textContent"),/above the three-copy limit/);
    await addDeckItem('wiki-286601');assert.match(await evaluate("document.querySelector('.deck-issues').textContent"),/shares no faction with the selected team/);
    assert.equal(await rawInventory(),guestBefore);
    passed('G2 exact Character profiles preserve repeated cores, auto-fill the matching multiset and flag copy/faction violations');

    const validG2=await activeDeck();validG2.id='deck-import-fixture';validG2.title='G2 imported 40-card fixture';
    const ids=['wiki-282358','wiki-282359','wiki-282397','wiki-279662','wiki-279663','wiki-282360','wiki-279622','wiki-279623','wiki-279624','wiki-279625','wiki-279626','wiki-282361','wiki-279366','wiki-282398'];
    const sourceCards=JSON.parse(await readFile(join(root,'baku','bakugan_card_archive','data','cards.json'),'utf8')).cards;
    validG2.cards=ids.map((id,index)=>({zone:'deck',id,name:sourceCards.find(card=>card.id===id).name,quantity:index===13?1:3}));
    const beforeDeckImport=await savedLibrary();await evaluate(`(() => {const t=new DataTransfer();t.items.add(new File([${JSON.stringify(JSON.stringify({schemaVersion:1,deck:validG2}))}],'fixture.json',{type:'application/json'}));const input=document.getElementById('deck-import-file');input.files=t.files;input.dispatchEvent(new Event('change',{bubbles:true}))})()`);
    await until(()=>evaluate("document.querySelector('dialog[open] #deck-dialog-title')?.textContent==='Preview deck import'"),'deck import preview');assert.deepEqual(await savedLibrary(),beforeDeckImport);
    await deckSave(()=>deckButton('confirm-dialog'));await until(()=>evaluate("!document.querySelector('dialog[open]')"),'import closed');assert.equal(await deckState(),'checks-passed');assert.equal((await activeDeck()).cards.reduce((n,c)=>n+c.quantity,0),40);assert.equal((await savedLibrary()).decks.length,3);
    assert.match(await evaluate("document.querySelector('[aria-label=\"Deck analysis\"]').textContent"),/Energy curve/);
    await evaluate("document.querySelector('[aria-label=\"Team\"]').scrollIntoView({block:'start',behavior:'instant'})");
    const deckDesktop=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(output,'deckbuilder-g2-desktop.png'),Buffer.from(deckDesktop.data,'base64'));
    await call('Emulation.setDeviceMetricsOverride',{width:320,height:800,deviceScaleFactor:1,mobile:true});assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
    await evaluate("document.querySelector('[aria-label=\"BakuCores\"]').scrollIntoView({block:'start',behavior:'instant'})");const deckMobile=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(output,'deckbuilder-g2-mobile.png'),Buffer.from(deckMobile.data,'base64'));
    await call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
    const beforeSwitch=await activeDeck();await evaluate("(() => {const f=document.querySelector('form[data-form=format]');f.elements.format.value='g1-nv-basic-v1';f.requestSubmit()})()");assert.match(await evaluate("document.querySelector('dialog[open]').textContent"),/All team members, cards and core selections are retained/);
    await deckSave(()=>deckButton('confirm-dialog'));assert.equal((await activeDeck()).formatId,'g1-nv-basic-v1');assert.deepEqual((await activeDeck()).cards,beforeSwitch.cards);assert.deepEqual((await activeDeck()).team,beforeSwitch.team);assert.deepEqual((await activeDeck()).cores,beforeSwitch.cores);assert.equal(await deckState(),'incomplete');
    assert.equal(await rawInventory(),guestBefore);
    passed('40-card G2 draft import checks pass, energy curve and 320px layout work, format switch preserves incompatible entries');
    assert.deepEqual(errors, [], 'No unhandled browser exceptions');
    console.log(`Browser smoke passed: ${checks} checks. Screenshots: test-results/toy-pilot-{mobile,desktop}.png`);
} finally {
    socket?.close();
    for (const task of pending.values()) task.reject(new Error('Browser smoke ended.'));
    pending.clear();
    if (browser.exitCode === null) {
        const exited = once(browser, 'exit'); browser.kill();
        await Promise.race([exited, pause(3000)]);
    }
    await new Promise((resolve) => server.close(resolve));
    assert.ok(profile.startsWith(join(tmpdir(), 'donutcat-browser-')));
    await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}
