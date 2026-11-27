import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getStaticApps, validateStaticApp } from '../scripts/dev/static-apps.js';
import { sections } from '../scripts/site-config.js';
import { prepareCatalog } from '../vendor/bakugan_toy_archive/public/scripts/lib/catalog.js';
import { createPreviewServer } from '../scripts/dev/serve.js';
import { prepareCatalogs } from '../vendor/bakugan_deckbuilder/public/scripts/lib/catalog.js';
import { createDeck, addToy, setCardQuantity, validateDeck } from '../vendor/bakugan_deckbuilder/public/scripts/lib/decks.js';
import { requiredCores, validateConstruction } from '../vendor/bakugan_deckbuilder/public/scripts/lib/validate.js';

test('each standalone route has exactly one artifact contract', () => {
    const apps = getStaticApps({});
    const paths = Object.values(sections).flatMap((section) => Object.entries(section.subpages)
        .filter(([, page]) => page.type === 'static').map(([key]) => `${section.route}/${key}/`));
    assert.deepEqual(apps.map((app) => app.path).sort(), paths.sort());
    assert.equal(new Set(apps.map((app) => app.path)).size, apps.length);
});

test('the pinned toy archive matches its release and catalog contract', async () => {
    const app = getStaticApps({}).find((entry) => entry.page === 'bakugan-archive');
    await validateStaticApp(app);
    const data = JSON.parse(await readFile(join(app.source, 'data/toys.json'), 'utf8'));
    assert.equal(prepareCatalog(data).length, 1206);
    assert.equal(data.coverage.complete, false);
});

test('the collection manager has a pinned public release and canonical route', async () => {
    const app = getStaticApps({}).find(entry => entry.page === 'collection');
    assert.equal(app.path, '/baku/collection/');
    await validateStaticApp(app);
    const source = await readFile(join(app.source, 'scripts/lib/inventory.js'), 'utf8');
    assert.match(source, /bakugan-suite\.inventory\.v2/);
    const shared = getStaticApps({}).find(entry => entry.page === 'shared');
    assert.equal(shared.path, '/baku/shared/');
    assert.equal(shared.source, join(app.source, 'shared'));
    assert.ok(app.separateDirectories.includes('shared'));
    await validateStaticApp(shared);
    const config = JSON.parse(await readFile(join(app.source, 'data/service-config.json'), 'utf8'));
    assert.equal(config.schemaVersion, 1);
});

test('the deckbuilder release resolves real pinned fixtures for all five G1 and G2 formats',async()=>{
    const apps=getStaticApps({}),app=apps.find(entry=>entry.page==='deckbuilder');assert.equal(app.path,'/baku/deckbuilder/');await validateStaticApp(app);
    const cards=JSON.parse(await readFile(join(apps.find(entry=>entry.page==='bakugan_card_archive').source,'data/cards.json'),'utf8'));
    const toys=JSON.parse(await readFile(join(apps.find(entry=>entry.page==='bakugan-archive').source,'data/toys.json'),'utf8'));
    const catalog=prepareCatalogs(cards,toys);assert.ok(catalog.cards.size>=5516);assert.equal(catalog.toys.size,1206);
    assert.deepEqual(catalog.toys.get('toy-0043').choices[0].cores,['Shield','Shield']);
    let g1=createDeck('deck-fixture-g1','g1-nv-basic-v1');for(const id of ['toy-0001','toy-0002','toy-0001'])g1=addToy(g1,catalog.toys.get(id));
    for(const id of ['wiki-901','wiki-854','wiki-7905'])g1=setCardQuantity(g1,'gate',catalog.cards.get(id),1);for(const id of ['wiki-866','wiki-293938','wiki-307937'])g1=setCardQuantity(g1,'ability',catalog.cards.get(id),1);
    assert.equal(validateConstruction(g1,catalog).state,'checks-passed');
    let g2=createDeck('deck-fixture-g2','g2-bp-tcg-v1');for(const id of ['toy-0019','toy-0020','toy-0043'])g2=addToy(g2,catalog.toys.get(id));
    const ids=['wiki-282358','wiki-282359','wiki-282397','wiki-279662','wiki-279663','wiki-282360','wiki-279622','wiki-279623','wiki-279624','wiki-279625','wiki-279626','wiki-282361','wiki-279366','wiki-282398'];for(const [index,id] of ids.entries())g2=setCardQuantity(g2,'deck',catalog.cards.get(id),index===13?1:3);
    g2=validateDeck({...g2,cores:requiredCores(g2,catalog).cores});assert.deepEqual(g2.cores,{Fist:2,'Flaming Fist':1,Shield:3,'Magic Shield':0,Helix:0});
    assert.equal(validateConstruction(g2,catalog).state,'checks-passed');
    let big=validateDeck({...g1,formatId:'g1-nv-big-game-v1'});
    for(const id of ['toy-0002','toy-0001','toy-0002'])big=addToy(big,catalog.toys.get(id));
    for(const id of ['wiki-916','wiki-1614','wiki-8055'])big=setCardQuantity(big,'gate',catalog.cards.get(id),1);
    for(const id of ['wiki-844','wiki-889','wiki-860'])big=setCardQuantity(big,'ability',catalog.cards.get(id),1);
    assert.equal(validateConstruction(big,catalog).state,'checks-passed');
    assert.ok(validateConstruction(setCardQuantity(big,'gate',catalog.cards.get('wiki-901'),2),catalog).issues.some(issue=>issue.id==='big-game.copies'&&issue.severity==='error'));
    assert.equal([...catalog.toys.values()].filter(toy=>toy.series==='Armored Alliance'&&toy.choices.length).length,126);
    let aa=validateDeck({...g2,formatId:'g2-bp-aa-tcg-v1',team:g2.team.slice(1)});aa=addToy(aa,catalog.toys.get('toy-0057'));
    aa=setCardQuantity(aa,'deck',catalog.cards.get(ids.at(-1)),0);aa=setCardQuantity(aa,'deck',catalog.cards.get('wiki-291286'),1);
    aa=validateDeck({...aa,cores:requiredCores(aa,catalog).cores});assert.deepEqual(aa.cores,{Fist:3,'Flaming Fist':0,Shield:3,'Magic Shield':0,Helix:0});
    assert.equal(validateConstruction(aa,catalog).state,'checks-passed');
    assert.equal(validateConstruction({...aa,formatId:'g2-bp-tcg-v1'},catalog).state,'incomplete');
    assert.equal([...catalog.toys.values()].filter(toy=>toy.choices.length).length,550);
    assert.deepEqual(catalog.toys.get('toy-1096').choices.map(choice=>choice.cardId),['wiki-300520','wiki-302480']);
    let later=validateDeck({...g2,formatId:'g2-all-seasons-single-faction-v1',team:[]});
    for(const id of ['toy-1099','toy-1101','toy-1109'])later=addToy(later,catalog.toys.get(id));
    later=validateDeck({...later,cores:requiredCores(later,catalog).cores});assert.deepEqual(later.cores,{Fist:2,'Flaming Fist':1,Shield:2,'Magic Shield':1,Helix:0});
    assert.equal(validateConstruction(later,catalog).state,'checks-passed');assert.equal(validateConstruction({...later,formatId:'g2-bp-aa-tcg-v1'},catalog).state,'incomplete');
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

test('assembly rejects an internally consistent toy snapshot pinned to a different card catalog', async () => {
    const original = getStaticApps({}).find((entry) => entry.page === 'bakugan-archive');
    const temporary = await mkdtemp(join(tmpdir(), 'donutcat-card-pin-'));
    try {
        const source = join(temporary, 'public');
        await cp(original.source, source, { recursive: true });
        const catalog = JSON.parse(await readFile(join(source, 'data/toys.json'), 'utf8'));
        catalog.cardCatalog.sha256 = '0'.repeat(64);
        for (const profile of catalog.profiles) if (profile.linkEvidence) profile.linkEvidence.cardCatalogSha256 = catalog.cardCatalog.sha256;
        const bytes = `${JSON.stringify(catalog, null, 2)}\n`;
        await writeFile(join(source, 'data/toys.json'), bytes);
        const manifest = JSON.parse(await readFile(original.release, 'utf8'));
        manifest.files['data/toys.json'] = createHash('sha256').update(bytes).digest('hex');
        const release = join(temporary, 'release.json');
        await writeFile(release, JSON.stringify(manifest));
        await assert.rejects(validateStaticApp({ ...original, source, release }), /pinned card catalog/);
    } finally {
        assert.ok(temporary.startsWith(join(tmpdir(), 'donutcat-card-pin-')));
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
