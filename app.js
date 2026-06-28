const ARBITRAGE_URL = 'https://www.predictionhunt.com/arbitrage';
const ACCESS_CODE = 'arbitrage';
const ACCESS_STORAGE_KEY = 'arbitrage_dashboard_access';

const accessCodeInput = document.getElementById('accessCode');
const unlockButton = document.getElementById('unlockButton');
const refreshButton = document.getElementById('refreshButton');
const lockButton = document.getElementById('lockButton');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');
const entryCountEl = document.getElementById('entryCount');
const bestRoiEl = document.getElementById('bestRoi');

const asNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const setStatus = (message, tone = '') => {
  if (!statusEl) {
    return;
  }

  statusEl.textContent = message;
  statusEl.className = `status ${tone}`.trim();
};

const setBusy = (busy) => {
  if (unlockButton) {
    unlockButton.disabled = busy;
    unlockButton.textContent = busy ? 'Loading…' : 'Open Dashboard';
  }

  if (refreshButton) {
    refreshButton.disabled = busy;
  }

  if (lockButton) {
    lockButton.disabled = busy;
  }
};

const renderEmpty = (message) => {
  if (!resultsEl) {
    return;
  }

  resultsEl.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
};

const hasAccess = () => localStorage.getItem(ACCESS_STORAGE_KEY) === 'granted';

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
  if (!resultsEl || !entryCountEl || !bestRoiEl) {
    return;
  }

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
  if (!hasAccess()) {
    window.location.href = 'index.html';
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
    if (entryCountEl) {
      entryCountEl.textContent = '0';
    }

    if (bestRoiEl) {
      bestRoiEl.textContent = '-';
    }

    renderEmpty(error.message || 'Failed to load ROI values.');
    setStatus(error.message || 'Failed to load ROI values.', 'error');
  } finally {
    setBusy(false);
  }
};

const unlockDashboard = () => {
  const code = accessCodeInput ? accessCodeInput.value.trim() : '';
  if (!code || code !== ACCESS_CODE) {
    setStatus('Invalid code. Dashboard remains locked.', 'error');
    return;
  }

  localStorage.setItem(ACCESS_STORAGE_KEY, 'granted');
  setStatus('Access granted. Opening dashboard…', 'success');
  window.location.href = 'dashboard.html';
};

const lockDashboard = () => {
  localStorage.removeItem(ACCESS_STORAGE_KEY);
  window.location.href = 'index.html';
};

const initAccessPage = () => {
  if (!accessCodeInput || !unlockButton) {
    return;
  }

  if (hasAccess()) {
    window.location.href = 'dashboard.html';
    return;
  }

  unlockButton.addEventListener('click', unlockDashboard);

  accessCodeInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      unlockDashboard();
    }
  });
};

const initDashboardPage = () => {
  if (!refreshButton || !resultsEl) {
    return;
  }

  if (!hasAccess()) {
    window.location.href = 'index.html';
    return;
  }

  refreshButton.addEventListener('click', loadTopRoi);

  if (lockButton) {
    lockButton.addEventListener('click', lockDashboard);
  }

  renderEmpty('Loading ROI values…');
  loadTopRoi();
};

if (accessCodeInput) {
  initAccessPage();
}

if (refreshButton && resultsEl) {
  initDashboardPage();
}
