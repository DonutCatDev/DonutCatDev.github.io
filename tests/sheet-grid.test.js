import test from 'node:test';
import assert from 'node:assert/strict';

import { parseExternalUrl, parseGvizResponse } from '../scripts/lib/sheet-grid.js';

test('parses labeled Google Visualization data and formatted cells', () => {
    const response = `google.visualization.Query.setResponse(${JSON.stringify({
        status: 'ok',
        table: {
            cols: [{ label: 'Name' }, { label: 'Date' }],
            rows: [{ c: [{ v: 'Event' }, { v: 'Date(2026,9,27)', f: '10/27/2026' }] }]
        }
    })});`;
    const result = parseGvizResponse(response);

    assert.deepEqual(result.headers, ['Name', 'Date']);
    assert.equal(result.rows[0].Name, 'Event');
    assert.equal(result.rows[0].Date, '10/27/2026');
});

test('uses the first row for missing headers and makes duplicates unique', () => {
    const response = JSON.stringify({
        status: 'ok',
        table: {
            cols: [{ label: '' }, { label: '' }],
            rows: [
                { c: [{ v: 'Color' }, { v: 'Color' }] },
                { c: [{ v: 'Blue' }, { v: 'Navy' }] }
            ]
        }
    });
    const result = parseGvizResponse(response);

    assert.deepEqual(result.headers, ['Color', 'Color (2)']);
    assert.equal(result.rows[0]['Color (2)'], 'Navy');
});

test('rejects malformed and reported-error responses', () => {
    assert.throws(() => parseGvizResponse('not json'), /unreadable/i);
    assert.throws(() => parseGvizResponse(JSON.stringify({ status: 'error' })), /reported an error/i);
});

test('permits only recognizable HTTP and HTTPS links', () => {
    assert.equal(parseExternalUrl('www.example.com').href, 'https://www.example.com/');
    assert.equal(parseExternalUrl('https://example.com/path').href, 'https://example.com/path');
    assert.equal(parseExternalUrl('javascript:alert(1)'), null);
    assert.equal(parseExternalUrl('ordinary text'), null);
});
