import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getStaticApps, validateStaticApp } from '../scripts/dev/static-apps.js';
import { sections } from '../scripts/site-config.js';
import { prepareCatalog } from '../vendor/bakugan_toy_archive/public/scripts/lib/catalog.js';
import { createPreviewServer } from '../scripts/dev/serve.js';

test('each standalone route has exactly one artifact contract', () => {
    const apps = getStaticApps({});
    const paths = Object.values(sections).flatMap((section) => Object.entries(section.subpages)
        .filter(([, page]) => page.type === 'static').map(([key]) => `${section.route}/${key}/`));
    assert.deepEqual(apps.map((app) => app.path).sort(), paths.sort());
    assert.equal(new Set(apps.map((app) => app.path)).size, apps.length);
});

test('the checked toy snapshot matches its release and catalog contract', async () => {
    const app = getStaticApps({}).find((entry) => entry.page === 'bakugan-archive');
    await validateStaticApp(app);
    const data = JSON.parse(await readFile(join(app.source, 'data/toys.json'), 'utf8'));
    assert.equal(prepareCatalog(data).length, 44);
    assert.equal(data.coverage.complete, false);
});

test('snapshot validation rejects tampering, extra files, and missing required assets', async () => {
    const temporary = await mkdtemp(join(tmpdir(), 'donutcat-snapshot-'));
    try {
        const source = join(temporary, 'public');
        await mkdir(source);
        const release = join(temporary, 'release.json');
        await writeFile(join(source, 'index.html'), 'changed');
        await writeFile(release, JSON.stringify({ schemaVersion: 1, files: { 'index.html': '0'.repeat(64) } }));
        const app = { page: 'fixture', source, release, required: ['index.html'] };
        await assert.rejects(validateStaticApp(app), /checksum mismatch/);
        await writeFile(join(source, 'unexpected.txt'), 'not part of release');
        await assert.rejects(validateStaticApp(app), /file count/);
        await assert.rejects(validateStaticApp({ ...app, required: ['missing.json'] }), /missing/);
    } finally {
        assert.ok(temporary.startsWith(join(tmpdir(), 'donutcat-snapshot-')));
        await rm(temporary, { recursive: true, force: true });
    }
});

test('preview serves standalone paths and keeps the SPA handoff, invalid paths, and source boundary safe', async () => {
    const temporary = await mkdtemp(join(tmpdir(), 'donutcat-preview-'));
    let server;
    try {
        await mkdir(join(temporary, 'baku', 'toy'), { recursive: true });
        await writeFile(join(temporary, 'baku', 'toy', 'index.html'), '<h1>Toy fixture</h1>');
        await writeFile(join(temporary, '404.html'), 'SPA handoff');
        server = createPreviewServer(temporary);
        await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
        const base = `http://127.0.0.1:${server.address().port}`;
        const redirect = await fetch(`${base}/baku/toy?item=toy-0001`, { redirect: 'manual' });
        assert.equal(redirect.status, 301);
        assert.equal(redirect.headers.get('location'), '/baku/toy/?item=toy-0001');
        assert.match(await (await fetch(`${base}/baku/toy/`)).text(), /Toy fixture/);
        assert.equal((await fetch(`${base}/baku/toy/index.html`)).status, 200);
        assert.equal((await fetch(`${base}/unknown`)).status, 404);
        assert.equal((await fetch(`${base}/%XX`)).status, 400);
        assert.equal((await fetch(`${base}/..%2f..%2fpackage.json`)).status, 404);
    } finally {
        if (server) await new Promise((resolve) => server.close(resolve));
        assert.ok(temporary.startsWith(join(tmpdir(), 'donutcat-preview-')));
        await rm(temporary, { recursive: true, force: true });
    }
});
