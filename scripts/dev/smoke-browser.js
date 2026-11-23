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
async function readyCatalog() { await until(() => evaluate("document.querySelector('.result-summary')?.textContent.includes('44') && !document.querySelector('.search-panel').hidden"), 'catalog loaded'); }
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
    assert.equal(await evaluate("document.querySelectorAll('.toy-tile').length"), 8);
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
    assert.match(await evaluate("document.querySelector('.result-summary').textContent"), /^18 of 44 variants/);
    await choose('faction', 'Pyrus');
    assert.match(await evaluate("document.querySelector('.result-summary').textContent"), /^9 of 44 variants/);
    await choose('treatment', 'Pearl');
    assert.match(await evaluate("document.querySelector('.result-summary').textContent"), /^1 of 44 variants/);
    await evaluate("document.querySelector('[data-item]').click()");
    assert.equal(await evaluate("document.querySelector('dialog').open"), true);
    assert.equal(await evaluate('document.activeElement.id'), 'toy-detail-heading');
    assert.match(await evaluate("document.querySelector('#toy-detail-heading').textContent"), /560 G/);
    assert.equal(await evaluate("document.querySelector('dialog a[target=_blank]').rel"), 'noopener noreferrer');
    assert.match(await evaluate("document.querySelector('dialog').textContent"), /facts have not yet been reviewed/);
    assert.equal(await evaluate("document.querySelector('dialog a[href*=\"Template\"]').href.includes('B1_Delta_Dragonoid_Bakulog')"), true);
    assert.equal(await evaluate("document.querySelector('dialog a[href*=oldid]').href.includes('oldid=858181')"), true);
    await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
    await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
    await until(() => evaluate("!document.querySelector('dialog').open"), 'Escape closes details');
    assert.equal(await evaluate('document.activeElement.dataset.item'), 'toy-0004');
    await evaluate('history.back()');
    await until(() => evaluate("document.querySelector('dialog').open"), 'Back restores details');
    await evaluate('history.forward()');
    await until(() => evaluate("!document.querySelector('dialog').open"), 'Forward closes details');
    passed('intersecting filters, keyboard dialog, Back/Forward, safe source links');
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
    assert.equal(await evaluate("document.querySelector('.paging span').textContent"), 'Page 2 of 4');
    passed('safe URL/search text, empty state, pagination and direct refresh');
    await navigate('/baku/bakugan-archive/?item=toy-0043', "Boolean(document.querySelector('dialog')?.open)");
    assert.match(await evaluate('document.title'), /Aquos Hydorous/);
    assert.match(await evaluate("document.querySelector('dialog').textContent"), /Not yet verified/);
    await navigate('/baku/bakugan-archive/?item=missing', "Boolean(document.querySelector('.notice') && !document.querySelector('.notice').hidden)");
    assert.equal(await evaluate("document.querySelector('dialog').open"), false);
    passed('direct variant links and unknown item recovery');

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
    intercept = ({ requestId }) => call('Fetch.fulfillRequest', { requestId, responseCode: 200, body: Buffer.from(JSON.stringify(empty)).toString('base64') });
    await navigate('/baku/bakugan-archive/', "Boolean(document.querySelector('.empty-state'))");
    assert.equal(await evaluate("document.querySelector('.empty-state h2').textContent"), 'The catalog is empty.');
    await call('Fetch.disable'); intercept = null;
    passed('valid empty catalog state');

    // Synthetic metadata/photos exercise future reviewed entries without publishing them.
    const evidenceFixture = JSON.parse(await readFile(join(root, 'baku/bakugan-archive/data/toys.json'), 'utf8'));
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
    await navigate('/baku/bakugan-archive/'); await readyCatalog();
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
    await call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await call('Page.reload'); await readyCatalog();
    const desktop = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(join(output, 'toy-pilot-desktop.png'), Buffer.from(desktop.data, 'base64'));
    passed('320px layout, reduced motion, forced colors, desktop/mobile screenshots');
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
