const ARBITRAGE_URL = 'https://www.predictionhunt.com/arbitrage';
const ACCESS_CODE = 'arbitrage';

const accessCodeInput = document.getElementById('accessCode');
const unlockButton = document.getElementById('unlockButton');
const refreshButton = document.getElementById('refreshButton');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');
const entryCountEl = document.getElementById('entryCount');
const bestRoiEl = document.getElementById('bestRoi');

const asNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

let unlocked = false;

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const setStatus = (message, tone = '') => {
  statusEl.textContent = message;
  statusEl.className = `status ${tone}`.trim();
};

const setBusy = (busy) => {
  unlockButton.disabled = busy;
  refreshButton.disabled = busy;
  unlockButton.textContent = busy ? 'Loading…' : 'Unlock Dashboard';
};

const renderEmpty = (message) => {
  resultsEl.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
};

const fetchArbitrageHtml = async () => {
  const endpoints = [
    ARBITRAGE_URL,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(ARBITRAGE_URL)}`,
    'https://r.jina.ai/http://www.predictionhunt.com/arbitrage'
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      if (!response.ok) {
        continue;
      }

      const html = await response.text();
      if (html && html.length > 1000) {
        return html;
      }
    } catch {
      // Try the next endpoint.
    }
  }

  throw new Error('Unable to load arbitrage page data right now.');
};

const extractTopRoiValues = (html) => {
  const matches = [...html.matchAll(/(-?\d+(?:\.\d+)?)\s*%/g)];
  const values = matches
    .map((match) => asNumber(match[1]))
    .filter((value) => value !== null && value > 0)
    .sort((a, b) => b - a);

  const deduped = [];
  values.forEach((value) => {
    const rounded = Number(value.toFixed(2));
    if (!deduped.includes(rounded)) {
      deduped.push(rounded);
    }
  });

  return deduped.slice(0, 20);
};

const renderRates = (rates) => {
  if (!rates.length) {
    entryCountEl.textContent = '0';
    bestRoiEl.textContent = '-';
    renderEmpty('No ROI percentages found on the source page.');
    return;
  }

  entryCountEl.textContent = String(rates.length);
  bestRoiEl.textContent = `${rates[0].toFixed(2)}%`;

  resultsEl.innerHTML = `
    <section class="topic-card card">
      <div class="topic-header">
        <h3 class="topic-title">Highest ROI Rates</h3>
        <span class="badge">Source: PredictionHunt</span>
      </div>
      <div class="roi-grid">
        ${rates.map((rate, index) => `
          <article class="roi-card">
            <p>#${index + 1}</p>
            <h4>${rate.toFixed(2)}%</h4>
          </article>
        `).join('')}
      </div>
    </section>
  `;
};

const loadTopRoi = async () => {
  if (!unlocked) {
    setStatus('Enter the dashboard code to unlock access.', 'error');
    return;
  }

  setBusy(true);
  setStatus('Loading ROI values from PredictionHunt arbitrage…');

  try {
    const html = await fetchArbitrageHtml();
    const rates = extractTopRoiValues(html);
    renderRates(rates);
    setStatus(`Loaded ${rates.length} top ROI values.`, 'success');
  } catch (error) {
    entryCountEl.textContent = '0';
    bestRoiEl.textContent = '-';
    renderEmpty(error.message || 'Failed to load ROI values.');
    setStatus(error.message || 'Failed to load ROI values.', 'error');
  } finally {
    setBusy(false);
    refreshButton.disabled = !unlocked;
  }
};

const unlockDashboard = () => {
  const code = accessCodeInput.value.trim();
  if (!code || code !== ACCESS_CODE) {
    unlocked = false;
    refreshButton.disabled = true;
    entryCountEl.textContent = '0';
    bestRoiEl.textContent = '-';
    setStatus('Invalid code. Dashboard remains locked.', 'error');
    renderEmpty('Access denied. Enter the correct dashboard code.');
    return;
  }

  unlocked = true;
  refreshButton.disabled = false;
  setStatus('Dashboard unlocked.', 'success');
  loadTopRoi();
};

unlockButton.addEventListener('click', unlockDashboard);
refreshButton.addEventListener('click', loadTopRoi);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    if (unlocked) {
      loadTopRoi();
      return;
    }

    unlockDashboard();
  }
});

renderEmpty('Locked dashboard. Enter access code and click "Unlock Dashboard".');
