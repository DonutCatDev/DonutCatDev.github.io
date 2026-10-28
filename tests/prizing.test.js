import test from 'node:test';
import assert from 'node:assert/strict';

import { calculatePrizing } from '../scripts/lib/prizing.js';

test('calculates the Springfield ten-dollar Top 8 defaults', () => {
    const result = calculatePrizing({ totalPlayers: 32, tos: 1, topCut: 8, entry: 10, location: 'springfield' });

    assert.equal(result.ok, true);
    assert.equal(result.totalPool, 310);
    assert.equal(result.fund, 78);
    assert.equal(result.bottomHalfEach, 10);
    assert.deepEqual(result.payouts, { fourth: 32.75, third: 42.25, second: 61.5, first: 55.5 });
});

test('Springfield five-dollar events do not allocate a fund', () => {
    const result = calculatePrizing({ totalPlayers: 10, tos: 1, topCut: 4, entry: 5, location: 'springfield' });

    assert.equal(result.ok, true);
    assert.equal(result.totalPool, 45);
    assert.equal(result.fund, 0);
    assert.deepEqual(result.payouts, { fourth: 6.75, third: 9, second: 13.5, first: 15.75 });
});

test('all allocated money reconciles to the total pool', () => {
    const result = calculatePrizing({ totalPlayers: 48, tos: 2, topCut: 16, entry: 10, location: 'manassas' });
    const placements = Object.values(result.payouts).reduce((sum, payout) => sum + payout, 0);

    assert.equal(result.ok, true);
    assert.equal(result.fund + result.guaranteedPayouts + placements, result.totalPool);
});

test('rejects invalid player and TO counts', () => {
    assert.equal(calculatePrizing({ totalPlayers: 3.5, tos: 1, topCut: 4, entry: 5, location: 'manassas' }).ok, false);
    assert.equal(calculatePrizing({ totalPlayers: 3, tos: 4, topCut: 4, entry: 5, location: 'manassas' }).ok, false);
});

test('rejects prize pools that cannot cover guaranteed cut payouts', () => {
    const result = calculatePrizing({ totalPlayers: 2, tos: 0, topCut: 16, entry: 10, location: 'springfield' });

    assert.equal(result.ok, false);
    assert.match(result.errors[0], /too small/i);
});

test('warns when a funded cut is larger than attendance', () => {
    const result = calculatePrizing({ totalPlayers: 7, tos: 0, topCut: 8, entry: 10, location: 'manassas' });

    assert.equal(result.ok, true);
    assert.match(result.warnings[0], /larger/i);
});
