import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildPages } from '../scripts/dev/build-pages.js';
import { checkProductionConfig, STAGING_API, PRODUCTION_API } from '../scripts/dev/staging-artifact.js';

test('production assembly rejects a staging or unexpected API origin', () => {
    checkProductionConfig({schemaVersion:1,apiOrigin:null});
    checkProductionConfig({schemaVersion:1,apiOrigin:PRODUCTION_API});
    for (const apiOrigin of [STAGING_API,'https://example.com',undefined]) assert.throws(()=>checkProductionConfig({schemaVersion:1,apiOrigin}),/Production configuration/);
});

test('staging build isolates config, adds noindex headers and banner, and leaves the pinned public data alone', async () => {
    const source = new URL('../vendor/bakugan_collection/public/data/service-config.json',import.meta.url);
    const before = await readFile(source,'utf8');
    const output = await buildPages({target:'staging'});
    assert.ok(output.endsWith('_site-staging'));
    assert.deepEqual(JSON.parse(await readFile(join(output,'baku/collection/data/service-config.json'),'utf8')),{schemaVersion:1,apiOrigin:STAGING_API});
    assert.match(await readFile(join(output,'_headers'),'utf8'),/X-Robots-Tag: noindex, nofollow/);
    assert.match(await readFile(join(output,'robots.txt'),'utf8'),/Disallow: \//);
    for (const path of ['index.html','baku/bakugan_card_archive/index.html','baku/bakugan-archive/index.html','baku/collection/index.html','baku/deckbuilder/index.html','baku/shared/index.html']) {
        assert.match(await readFile(join(output,path),'utf8'),/Bakugan staging/);
    }
    await assert.rejects(access(join(output,'CNAME')));
    await assert.rejects(access(join(output,'sitemap.xml')));
    assert.equal(await readFile(source,'utf8'),before);
});
