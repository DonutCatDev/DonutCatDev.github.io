import test from 'node:test';
import assert from 'node:assert/strict';

import { getCanonicalPath, getFallbackLocation, normalizePath } from '../scripts/lib/router-utils.js';

test('normalizes slashes, missing roots, and trailing slashes', () => {
    assert.equal(normalizePath('bey//prizing-calculator/'), '/bey/prizing-calculator');
    assert.equal(normalizePath('/'), '/');
    assert.equal(normalizePath(''), '/');
});

test('resolves legacy aliases after normalization', () => {
    assert.equal(getCanonicalPath('/bey/dmvbx-topcut-data-2/', {
        '/bey/dmvbx-topcut-data-2': '/bey/dmvbx-topcut-data'
    }), '/bey/dmvbx-topcut-data');
});

test('accepts same-origin fallback routes', () => {
    const search = `?__route=${encodeURIComponent('/printing/print-filament-grid?view=all')}`;
    assert.equal(getFallbackLocation(search, 'https://donutcat.org'), '/printing/print-filament-grid?view=all');
});

test('rejects cross-origin fallback routes', () => {
    const search = `?__route=${encodeURIComponent('https://example.com/not-ours')}`;
    assert.equal(getFallbackLocation(search, 'https://donutcat.org'), null);
});
