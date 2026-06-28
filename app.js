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
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const cleaned = value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  if (!cleaned) {
    return null;
  }

  const num = Number(cleaned[0]);
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

const pickString = (obj, keys) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
};

const pickPercent = (obj, keys) => {
  for (const key of keys) {
    const num = asNumber(obj?.[key]);
    if (num !== null) {
      return num;
    }
  }

  return null;
};

const normalizeMarket = (market) => {
  if (!market || typeof market !== 'object') {
    return null;
  }

  const name = pickString(market, ['name', 'platform', 'exchange', 'source', 'market']);
  if (!name) {
    return null;
  }

  const sideValue = pickString(market, ['side', 'position', 'action', 'choice', 'order']);
  const side = sideValue ? sideValue : 'N/A';

  const volumeValue = pickString(market, ['volume', 'vol', 'liquidity']);
  const volumeNum = asNumber(market?.volume) ?? asNumber(market?.vol) ?? asNumber(market?.liquidity);
  const volume = volumeValue || (volumeNum !== null ? `$${volumeNum}` : 'N/A');

  const priceValue = pickString(market, ['priceText', 'price', 'odds', 'cost']);
  const cents = asNumber(market?.cents);
  const priceNum = asNumber(market?.price) ?? asNumber(market?.odds) ?? asNumber(market?.cost);
  const price = priceValue || (cents !== null ? `${cents}¢` : priceNum !== null ? `${priceNum}` : 'N/A');

  const status = pickString(market, ['status', 'state', 'marketStatus']) || 'Open market';

  return {
    name,
    side,
    volume,
    price,
    status
  };
};

const normalizeOpportunity = (item) => {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const title = pickString(item, ['title', 'question', 'marketQuestion', 'event', 'name']);
  const roi = pickPercent(item, ['roi', 'roiPercent', 'roi_percentage', 'profitPercent']);

  if (!title || roi === null || roi <= 0) {
    return null;
  }

  const apy = pickPercent(item, ['apy', 'apyPercent', 'annualizedApy']);
  const outcome = pickString(item, ['outcome', 'selection', 'answer', 'performer']);

  const cost = pickString(item, ['costText', 'cost', 'totalCost']) || 'See market legs below.';
  const payout = pickString(item, ['payoutText', 'payout']) || 'One side always wins. Market payout is always $1.00.';
  const edge = pickString(item, ['edgeText', 'edge', 'profitText']) || `${roi.toFixed(2)}% estimated ROI.`;

  const marketGroups = [
    ...(Array.isArray(item.markets) ? item.markets : []),
    ...(Array.isArray(item.legs) ? item.legs : []),
    ...(Array.isArray(item.sides) ? item.sides : []),
    ...(Array.isArray(item.positions) ? item.positions : [])
  ];

  const markets = marketGroups.map(normalizeMarket).filter(Boolean);

  return {
    title,
    roi,
    apy,
    outcome: outcome || 'Market opportunity',
    cost,
    payout,
    edge,
    markets
  };
};

const collectCandidateObjects = (input, list = []) => {
  if (!input) {
    return list;
  }

  if (Array.isArray(input)) {
    input.forEach((item) => collectCandidateObjects(item, list));
    return list;
  }

  if (typeof input !== 'object') {
    return list;
  }

  const looksLikeOpportunity = (
    ['roi', 'roiPercent', 'roi_percentage', 'profitPercent'].some((key) => key in input)
    && ['title', 'question', 'marketQuestion', 'event', 'name'].some((key) => key in input)
  );

  if (looksLikeOpportunity) {
    list.push(input);
  }

  Object.values(input).forEach((value) => collectCandidateObjects(value, list));
  return list;
};

const extractFromJsonScripts = (html) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const scripts = [...doc.querySelectorAll('script[type="application/json"], script#__NEXT_DATA__')];

  const candidates = [];
  scripts.forEach((script) => {
    const content = script.textContent?.trim();
    if (!content) {
      return;
    }

    try {
      const parsed = JSON.parse(content);
      collectCandidateObjects(parsed, candidates);
    } catch {
      // Skip invalid JSON blocks.
    }
  });

  return candidates;
};

const extractFromHtmlCards = (html) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const cards = [...doc.querySelectorAll('article, section, div')]
    .filter((el) => {
      const text = el.textContent || '';
      return (
        text.length > 40
        && text.length < 2500
        && /\d+(?:\.\d+)?\s*%/.test(text)
        && /(market|buy|yes|no|kalshi|polymarket)/i.test(text)
      );
    })
    .slice(0, 120);

  return cards.map((card) => {
    const titleEl = card.querySelector('h1, h2, h3, h4, [class*="title"], [class*="question"]');
    const title = titleEl?.textContent?.trim() || '';
    const roiMatch = card.textContent?.match(/([+\-]?\d+(?:\.\d+)?)\s*%/);
    const roi = roiMatch ? asNumber(roiMatch[1]) : null;

    if (!title || roi === null || roi <= 0) {
      return null;
    }

    const apyMatch = card.textContent?.match(/([+\-]?\d+(?:\.\d+)?)\s*%\s*APY/i);
    const apy = apyMatch ? asNumber(apyMatch[1]) : null;

    const marketEls = [...card.querySelectorAll('[class*="market"], [class*="leg"]')];
    const markets = marketEls.map((marketEl) => {
      const lines = (marketEl.textContent || '').split('\n').map((line) => line.trim()).filter(Boolean);
      if (!lines.length) {
        return null;
      }

      return {
        name: lines[0],
        side: lines[1] || 'N/A',
        volume: lines.find((line) => /^vol/i.test(line)) || 'N/A',
        price: lines.find((line) => /¢|\$/.test(line)) || 'N/A',
        status: lines[lines.length - 1] || 'Open market'
      };
    }).filter(Boolean);

    return {
      title,
      roi,
      apy,
      outcome: 'Market opportunity',
      cost: 'See market legs below.',
      payout: 'One side always wins. Market payout is always $1.00.',
      edge: `${roi.toFixed(2)}% estimated ROI.`,
      markets
    };
  }).filter(Boolean);
};

const dedupeAndSortOpportunities = (opportunities) => {
  const seen = new Set();

  const deduped = opportunities.filter((opportunity) => {
    const key = `${opportunity.title}|${opportunity.outcome}|${opportunity.roi.toFixed(2)}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });

  return deduped
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 30);
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

  return deduped.slice(0, 20).map((roi, index) => ({
    title: `PredictionHunt Opportunity #${index + 1}`,
    roi,
    apy: null,
    outcome: 'Market opportunity',
    cost: 'See market data on source page.',
    payout: 'One side always wins. Market payout is always $1.00.',
    edge: `${roi.toFixed(2)}% estimated ROI.`,
    markets: []
  }));
};

const extractOpportunities = (html) => {
  const fromJson = extractFromJsonScripts(html).map(normalizeOpportunity).filter(Boolean);
  const fromHtml = extractFromHtmlCards(html);
  const normalized = dedupeAndSortOpportunities([...fromJson, ...fromHtml]);

  if (normalized.length) {
    return normalized;
  }

  return extractTopRoiValues(html);
};

const renderOpportunities = (opportunities) => {
  if (!resultsEl || !entryCountEl || !bestRoiEl) {
    return;
  }

  if (!opportunities.length) {
    entryCountEl.textContent = '0';
    bestRoiEl.textContent = '-';
    renderEmpty('No opportunities found on the source page.');
    return;
  }

  entryCountEl.textContent = String(opportunities.length);
  bestRoiEl.textContent = `${opportunities[0].roi.toFixed(2)}%`;

  resultsEl.innerHTML = opportunities.map((opportunity) => {
    const badge = opportunity.apy !== null
      ? `${opportunity.roi.toFixed(2)}% ROI (${opportunity.apy.toFixed(2)}% APY)`
      : `${opportunity.roi.toFixed(2)}% ROI`;

    const marketCards = opportunity.markets.length
      ? opportunity.markets.map((market) => `
          <article class="market-card">
            <h4>${escapeHtml(market.name)}</h4>
            <p class="choice">${escapeHtml(market.side)}</p>
            <p>Vol: ${escapeHtml(market.volume)}</p>
            <p>${escapeHtml(market.price)}</p>
            <p>${escapeHtml(market.status)}</p>
          </article>
        `).join('')
      : `
          <article class="market-card">
            <h4>Source data</h4>
            <p class="choice">No detailed market legs parsed.</p>
            <p>Open the source for full leg-by-leg details.</p>
          </article>
        `;

    return `
      <section class="topic-card card">
        <div class="topic-header">
          <h3 class="topic-title">${escapeHtml(opportunity.title)}</h3>
          <span class="badge">${escapeHtml(badge)}</span>
        </div>
        <p class="performer">${escapeHtml(opportunity.outcome)}</p>
        <div class="equation-grid">
          <article class="eq-card">
            <p>Cost</p>
            <h4>${escapeHtml(opportunity.cost)}</h4>
          </article>
          <article class="eq-card">
            <p>Payout</p>
            <h4>${escapeHtml(opportunity.payout)}</h4>
          </article>
          <article class="eq-card">
            <p>Edge</p>
            <h4>${escapeHtml(opportunity.edge)}</h4>
          </article>
        </div>
        <div class="market-grid">${marketCards}</div>
      </section>
    `;
  }).join('');
};

const loadOpportunities = async () => {
  if (!hasAccess()) {
    window.location.href = 'index.html';
    return;
  }

  setBusy(true);
  setStatus('Loading arbitrage values from PredictionHunt…');

  try {
    const html = await fetchArbitrageHtml();
    const opportunities = extractOpportunities(html);
    renderOpportunities(opportunities);
    setStatus(`Loaded ${opportunities.length} opportunities from PredictionHunt.`, 'success');
  } catch (error) {
    if (entryCountEl) {
      entryCountEl.textContent = '0';
    }

    if (bestRoiEl) {
      bestRoiEl.textContent = '-';
    }

    renderEmpty(error.message || 'Failed to load opportunities.');
    setStatus(error.message || 'Failed to load opportunities.', 'error');
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

  refreshButton.addEventListener('click', loadOpportunities);

  if (lockButton) {
    lockButton.addEventListener('click', lockDashboard);
  }

  renderEmpty('Loading opportunities…');
  loadOpportunities();
};

if (accessCodeInput) {
  initAccessPage();
}

if (refreshButton && resultsEl) {
  initDashboardPage();
}
