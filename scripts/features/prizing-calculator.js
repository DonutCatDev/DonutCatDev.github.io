import { calculatePrizing } from '../lib/prizing.js';

const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

function field(labelText, control) {
    const wrapper = document.createElement('div');
    wrapper.className = 'calculator-field';
    const label = document.createElement('label');
    label.htmlFor = control.id;
    label.textContent = labelText;
    wrapper.append(label, control);
    return wrapper;
}

function select(id, name, choices, selected) {
    const control = document.createElement('select');
    control.id = id;
    control.name = name;
    choices.forEach(([value, label]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        option.selected = String(value) === String(selected);
        control.append(option);
    });
    return control;
}

function resultCard(labelText, id, className = '') {
    const card = document.createElement('div');
    card.className = `calculator-result${className ? ` ${className}` : ''}`;
    const label = document.createElement('span');
    label.className = 'calculator-result-label';
    label.textContent = labelText;
    const output = document.createElement('output');
    output.id = id;
    output.textContent = '$0.00';
    card.append(label, output);
    return { card, label, output };
}

export function mount(container) {
    const calculator = document.createElement('div');
    calculator.className = 'prizing-calculator';
    const intro = document.createElement('p');
    intro.className = 'calculator-intro';
    intro.textContent = 'Enter the tournament details below to calculate the prize pool and payouts.';
    const panel = document.createElement('div');
    panel.className = 'calculator-panel';
    const form = document.createElement('form');
    form.noValidate = true;
    const inputs = document.createElement('div');
    inputs.className = 'calculator-inputs';

    const players = document.createElement('input');
    players.id = 'total-players';
    players.name = 'totalPlayers';
    players.type = 'number';
    players.min = '0';
    players.step = '1';
    players.value = '32';
    players.inputMode = 'numeric';
    const tos = select('tos', 'tos', [[0, '0'], [1, '1'], [2, '2'], [3, '3'], [4, '4']], 1);
    const topCut = select('top-cut', 'topCut', [[4, '4'], [8, '8'], [16, '16']], 8);
    const entry = select('entry-fee', 'entry', [[5, '$5'], [10, '$10']], 10);
    const location = select('location', 'location', [['springfield', 'Springfield'], ['manassas', 'Manassas']], 'springfield');
    inputs.append(
        field('Total Players', players),
        field('TOs', tos),
        field('Top Cut', topCut),
        field('Entry', entry),
        field('Location', location)
    );
    form.append(inputs);

    const status = document.createElement('p');
    status.className = 'calculator-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    const heading = document.createElement('h2');
    heading.className = 'calculator-results-heading';
    heading.textContent = 'Prize payouts';

    const summary = document.createElement('div');
    summary.className = 'calculator-summary-results';
    const totalPool = resultCard('Total Pool', 'total-pool');
    const fund = resultCard('Fund', 'fund');
    summary.append(totalPool.card, fund.card);

    const cut = document.createElement('div');
    cut.className = 'calculator-cut-results';
    const bottomHalf = resultCard('Bottom Half', 'bottom-half');
    const middle = resultCard('5th–8th (each)', 'middle-payout');
    middle.card.hidden = true;
    cut.append(bottomHalf.card, middle.card);

    const placements = document.createElement('div');
    placements.className = 'calculator-placement-results';
    const fourth = resultCard('4th', 'fourth-payout');
    const third = resultCard('3rd', 'third-payout');
    const second = resultCard('2nd', 'second-payout');
    const first = resultCard('1st', 'first-payout', 'is-first');
    placements.append(fourth.card, third.card, second.card, first.card);
    panel.append(form, status, heading, summary, cut, placements);
    calculator.append(intro, panel);
    container.replaceChildren(calculator);

    const currency = (value) => currencyFormatter.format(value);
    const clearPlacements = () => {
        [fourth.output, third.output, second.output, first.output].forEach((output) => {
            output.textContent = '—';
        });
    };

    const update = () => {
        const configuration = {
            totalPlayers: players.value.trim() === '' ? Number.NaN : Number(players.value),
            tos: Number(tos.value),
            topCut: Number(topCut.value),
            entry: Number(entry.value),
            location: location.value
        };
        const result = calculatePrizing(configuration);
        middle.card.hidden = configuration.topCut !== 16;
        bottomHalf.label.textContent = configuration.topCut === 4
            ? 'Bottom Half'
            : `${configuration.topCut === 8 ? '5th–8th' : '9th–16th'} (each)`;
        bottomHalf.output.textContent = configuration.topCut === 4 ? 'N/A' : currency(configuration.entry);
        middle.output.textContent = currency(configuration.entry * 2);
        status.className = 'calculator-status';

        if (Number.isFinite(result.totalPool)) {
            totalPool.output.textContent = currency(result.totalPool);
            fund.output.textContent = currency(result.fund);
        } else {
            totalPool.output.textContent = '—';
            fund.output.textContent = '—';
        }

        if (!result.ok) {
            clearPlacements();
            status.textContent = result.errors[0];
            status.classList.add('is-error');
            return;
        }

        fourth.output.textContent = currency(result.payouts.fourth);
        third.output.textContent = currency(result.payouts.third);
        second.output.textContent = currency(result.payouts.second);
        first.output.textContent = currency(result.payouts.first);
        status.textContent = result.warnings[0] || '';
        if (result.warnings.length) {
            status.classList.add('is-warning');
        }
    };

    form.addEventListener('input', update);
    form.addEventListener('change', update);
    update();
    return () => {
        form.removeEventListener('input', update);
        form.removeEventListener('change', update);
        container.replaceChildren();
    };
}
