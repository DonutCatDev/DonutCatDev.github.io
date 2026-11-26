import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { getRouteDetails, sections } from '../scripts/site-config.js';

test('every configured route has complete unique metadata', () => {
    const paths = ['/'];
    for (const [sectionKey, section] of Object.entries(sections)) {
        paths.push(section.route);
        for (const subpageKey of Object.keys(section.subpages)) {
            paths.push(`/${sectionKey}/${subpageKey}`);
        }
    }

    assert.equal(new Set(paths).size, paths.length);
    paths.forEach((path) => {
        const route = getRouteDetails(path);
        assert.ok(route, `${path} should resolve`);
        assert.ok(route.title, `${path} should have a title`);
        assert.ok(route.description, `${path} should have a description`);
    });
});
test('the sitemap includes every indexable canonical route and omits the pilot', async () => {
    const sitemap = await readFile(new URL('../sitemap.xml', import.meta.url), 'utf8');
    const expected = ['/'];
    for (const [sectionKey, section] of Object.entries(sections)) {
        expected.push(section.route);
        Object.entries(section.subpages).forEach(([key, page]) => {
            if (page.indexable !== false) expected.push(`/${sectionKey}/${key}`);
        });
    }

    expected.forEach((path) => {
        const url = `https://donutcat.org${path}`;
        assert.match(sitemap, new RegExp(`<loc>${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc>`));
    });
    assert.equal(getRouteDetails('/baku/bakugan-archive').indexable, false);
    assert.doesNotMatch(sitemap, /<loc>https:\/\/donutcat\.org\/baku\/bakugan-archive\/?<\/loc>/);
    assert.equal(getRouteDetails('/baku/collection').indexable, false);
    assert.doesNotMatch(sitemap, /<loc>https:\/\/donutcat\.org\/baku\/collection\/?<\/loc>/);
    assert.equal(getRouteDetails('/baku/shared').indexable, false);
    assert.doesNotMatch(sitemap, /<loc>https:\/\/donutcat\.org\/baku\/shared\/?<\/loc>/);
});
