export const PRIZING_RULES = Object.freeze({
    supportedEntries: [5, 10],
    supportedTopCuts: [4, 8, 16],
    supportedLocations: ['springfield', 'manassas'],
    defaultFundRate: 0.25,
    springfieldFiveDollarFund: 0,
    standardFractions: { fourth: 0.15, third: 0.2, second: 0.3 },
    springfieldTenDollarFractions: { fourth: 0.17, third: 0.22, second: 0.32 }
});

function roundToQuarter(value) {
    return Math.round(value * 4) / 4;
}

export function calculatePrizing({ totalPlayers, tos, topCut, entry, location }) {
    const errors = [];
    const warnings = [];

    if (!Number.isInteger(totalPlayers) || totalPlayers < 0) {
        errors.push('Enter a nonnegative whole number of players.');
    }
    if (!Number.isInteger(tos) || tos < 0) {
        errors.push('Enter a nonnegative whole number of TOs.');
    }
    if (Number.isInteger(totalPlayers) && Number.isInteger(tos) && tos > totalPlayers) {
        errors.push('The number of TOs cannot exceed the total number of players.');
    }
    if (!PRIZING_RULES.supportedTopCuts.includes(topCut)) {
        errors.push('Select a supported Top Cut.');
    }
    if (!PRIZING_RULES.supportedEntries.includes(entry)) {
        errors.push('Select a supported entry fee.');
    }
    if (!PRIZING_RULES.supportedLocations.includes(location)) {
        errors.push('Select a supported location.');
    }

    if (errors.length > 0) {
        return { ok: false, errors, warnings };
    }

    const totalPool = (totalPlayers - tos) * entry;
    const fund = location === 'springfield' && entry === 5
        ? PRIZING_RULES.springfieldFiveDollarFund
        : Math.round(totalPool * PRIZING_RULES.defaultFundRate);
    const bottomHalfEach = topCut === 4 ? 0 : entry;
    const middleEach = topCut === 16 ? entry * 2 : 0;
    const guaranteedPayouts = bottomHalfEach * (topCut / 2) + middleEach * 4;
    const remainingPool = totalPool - fund - guaranteedPayouts;

    if (remainingPool < 0) {
        return {
            ok: false,
            errors: ['The prize pool is too small to cover the selected cut payouts.'],
            warnings,
            totalPool,
            fund,
            bottomHalfEach,
            middleEach,
            guaranteedPayouts
        };
    }

    const fractions = location === 'springfield' && entry === 10
        ? PRIZING_RULES.springfieldTenDollarFractions
        : PRIZING_RULES.standardFractions;
    const fourth = roundToQuarter(remainingPool * fractions.fourth);
    const third = roundToQuarter(remainingPool * fractions.third);
    const second = roundToQuarter(remainingPool * fractions.second);
    const first = remainingPool - fourth - third - second;

    if (topCut > totalPlayers) {
        warnings.push('The selected Top Cut is larger than the total number of players.');
    }

    return {
        ok: true,
        errors,
        warnings,
        totalPool,
        fund,
        bottomHalfEach,
        middleEach,
        guaranteedPayouts,
        remainingPool,
        payouts: { fourth, third, second, first }
    };
}
