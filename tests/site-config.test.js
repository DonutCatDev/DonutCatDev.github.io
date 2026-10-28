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
test('the sitemap includes every configured canonical route', async () => {
    const sitemap = await readFile(new URL('../sitemap.xml', import.meta.url), 'utf8');
    const expected = ['/'];
    for (const [sectionKey, section] of Object.entries(sections)) {
        expected.push(section.route);
        Object.keys(section.subpages).forEach((key) => expected.push(`/${sectionKey}/${key}`));
    }

    expected.forEach((path) => {
        const url = `https://donutcat.org${path}`;
        assert.match(sitemap, new RegExp(`<loc>${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc>`));
    });
});
