// Calculate tournament prize payouts from attendance and event configuration.
(function () {
    const container = document.getElementById('script-container');

    if (!container) {
        console.error('script-container element not found');
        return;
    }

    container.innerHTML = `
        <div class="prizing-calculator">
            <p class="calculator-intro">
                Enter the tournament details below to calculate the prize pool and payouts.
            </p>
            <div class="calculator-panel">
                <form id="prizing-form" novalidate>
                    <div class="calculator-inputs">
                        <div class="calculator-field">
                            <label for="total-players">Total Players</label>
                            <input id="total-players" name="totalPlayers" type="number" min="0" step="1" value="16" inputmode="numeric">
                        </div>
                        <div class="calculator-field">
                            <label for="tos">TOs</label>
                            <select id="tos" name="tos">
                                <option value="0">0</option>
                                <option value="1">1</option>
                                <option value="2" selected>2</option>
                                <option value="3">3</option>
                                <option value="4">4</option>
                            </select>
                        </div>
                        <div class="calculator-field">
                            <label for="top-cut">Top Cut</label>
                            <select id="top-cut" name="topCut">
                                <option value="4">4</option>
                                <option value="8" selected>8</option>
                                <option value="16">16</option>
                            </select>
                        </div>
                        <div class="calculator-field">
                            <label for="entry-fee">Entry</label>
                            <select id="entry-fee" name="entry">
                                <option value="5">$5</option>
                                <option value="10" selected>$10</option>
                            </select>
                        </div>
                        <div class="calculator-field">
                            <label for="location">Location</label>
                            <select id="location" name="location">
                                <option value="springfield" selected>Springfield</option>
                                <option value="manassas">Manassas</option>
                            </select>
                        </div>
                    </div>
                </form>

                <p id="calculator-status" class="calculator-status" role="status" aria-live="polite"></p>

                <h4 class="calculator-results-heading">Prize Payouts</h4>
                <div class="calculator-summary-results">
                    <div class="calculator-result">
                        <span class="calculator-result-label">Total Pool</span>
                        <output id="total-pool">$0.00</output>
                    </div>
                    <div class="calculator-result">
                        <span class="calculator-result-label">Fund</span>
                        <output id="fund">$0.00</output>
                    </div>
                </div>
                <div class="calculator-cut-results">
                    <div class="calculator-result">
                        <span id="bottom-half-label" class="calculator-result-label">Bottom Half</span>
                        <output id="bottom-half">N/A</output>
                    </div>
                    <div id="middle-payout-card" class="calculator-result" hidden>
                        <span class="calculator-result-label">5th–8th (each)</span>
                        <output id="middle-payout">$0.00</output>
                    </div>
                </div>
                <div class="calculator-placement-results">
                    <div class="calculator-result">
                        <span class="calculator-result-label">4th</span>
                        <output id="fourth-payout">$0.00</output>
                    </div>
                    <div class="calculator-result">
                        <span class="calculator-result-label">3rd</span>
                        <output id="third-payout">$0.00</output>
                    </div>
                    <div class="calculator-result">
                        <span class="calculator-result-label">2nd</span>
                        <output id="second-payout">$0.00</output>
                    </div>
                    <div class="calculator-result is-first">
                        <span class="calculator-result-label">1st</span>
                        <output id="first-payout">$0.00</output>
                    </div>
                </div>
            </div>
        </div>
    `;

    const form = container.querySelector('#prizing-form');
    const totalPlayersInput = container.querySelector('#total-players');
    const tosInput = container.querySelector('#tos');
    const topCutInput = container.querySelector('#top-cut');
    const entryInput = container.querySelector('#entry-fee');
    const locationInput = container.querySelector('#location');
    const status = container.querySelector('#calculator-status');
    const middlePayoutCard = container.querySelector('#middle-payout-card');
    const bottomHalfLabel = container.querySelector('#bottom-half-label');

    const outputs = {
        totalPool: container.querySelector('#total-pool'),
        fund: container.querySelector('#fund'),
        bottomHalf: container.querySelector('#bottom-half'),
        middle: container.querySelector('#middle-payout'),
        fourth: container.querySelector('#fourth-payout'),
        third: container.querySelector('#third-payout'),
        second: container.querySelector('#second-payout'),
        first: container.querySelector('#first-payout')
    };

    const currencyFormatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    function formatCurrency(value) {
        return currencyFormatter.format(value);
    }

    function roundToQuarter(value) {
        return Math.round(value * 4) / 4;
    }

    function setStatus(message = '', type = '') {
        status.textContent = message;
        status.className = 'calculator-status';
        if (type) {
            status.classList.add(`is-${type}`);
        }
    }

    function clearPlacementOutputs() {
        outputs.fourth.textContent = '—';
        outputs.third.textContent = '—';
        outputs.second.textContent = '—';
        outputs.first.textContent = '—';
    }

    function updateCalculator() {
        const totalPlayers = Number(totalPlayersInput.value);
        const tos = Number(tosInput.value);
        const topCut = Number(topCutInput.value);
        const entry = Number(entryInput.value);
        const location = locationInput.value;

        middlePayoutCard.hidden = topCut !== 16;
        bottomHalfLabel.textContent = topCut === 4
            ? 'Bottom Half'
            : `${topCut === 8 ? '5th–8th' : '9th–16th'} (each)`;
        outputs.bottomHalf.textContent = topCut === 4 ? 'N/A' : formatCurrency(entry);
        outputs.middle.textContent = formatCurrency(entry * 2);

        const playersAreValid = totalPlayersInput.value.trim() !== ''
            && Number.isInteger(totalPlayers)
            && totalPlayers >= 0;
        if (!playersAreValid) {
            outputs.totalPool.textContent = '—';
            outputs.fund.textContent = '—';
            clearPlacementOutputs();
            setStatus('Enter a nonnegative whole number of players.', 'error');
            return;
        }

        if (tos > totalPlayers) {
            outputs.totalPool.textContent = '—';
            outputs.fund.textContent = '—';
            clearPlacementOutputs();
            setStatus('The number of TOs cannot exceed the total number of players.', 'error');
            return;
        }

        const totalPool = (totalPlayers - tos) * entry;
        const fund = location === 'springfield' && entry === 5
            ? 0
            : Math.round(totalPool * 0.25);
        const bottomHalfPayout = topCut === 4 ? 0 : entry;
        const middlePayout = topCut === 16 ? entry * 2 : 0;
        const guaranteedPayouts = (bottomHalfPayout * topCut / 2) + (middlePayout * 4);
        const remainingPool = totalPool - fund - guaranteedPayouts;

        outputs.totalPool.textContent = formatCurrency(totalPool);
        outputs.fund.textContent = formatCurrency(fund);

        if (remainingPool < 0) {
            clearPlacementOutputs();
            setStatus('The prize pool is too small to cover the selected cut payouts.', 'error');
            return;
        }

        const specialPayout = location === 'springfield' && entry === 10;
        const fractions = specialPayout
            ? { fourth: 0.17, third: 0.22, second: 0.32 }
            : { fourth: 0.15, third: 0.20, second: 0.30 };

        const fourth = roundToQuarter(remainingPool * fractions.fourth);
        const third = roundToQuarter(remainingPool * fractions.third);
        const second = roundToQuarter(remainingPool * fractions.second);
        const first = remainingPool - fourth - third - second;

        outputs.fourth.textContent = formatCurrency(fourth);
        outputs.third.textContent = formatCurrency(third);
        outputs.second.textContent = formatCurrency(second);
        outputs.first.textContent = formatCurrency(first);

        if (topCut > totalPlayers) {
            setStatus('The selected Top Cut is larger than the total number of players.', 'warning');
        } else {
            setStatus();
        }
    }

    form.addEventListener('input', updateCalculator);
    form.addEventListener('change', updateCalculator);
    updateCalculator();
})();
