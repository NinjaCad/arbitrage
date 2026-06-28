const API_BASE = 'https://www.predictionhunt.com/api/v2';
const API_KEY_STORAGE = 'prediction-hunt-api-key';

const apiKeyInput = document.getElementById('apiKey');
const topicsInput = document.getElementById('topics');
const scanButton = document.getElementById('scanButton');
const refreshButton = document.getElementById('refreshButton');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');
const groupCountEl = document.getElementById('groupCount');
const platformCountEl = document.getElementById('platformCount');

const asNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const formatCell = (value) => {
  const num = asNumber(value);
  return num === null ? '-' : num.toFixed(3);
};

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const parseTopics = () => topicsInput.value
  .split(',')
  .map((topic) => topic.trim())
  .filter(Boolean);

const setStatus = (message, tone = '') => {
  statusEl.textContent = message;
  statusEl.className = `status ${tone}`.trim();
};

const setBusy = (busy) => {
  scanButton.disabled = busy;
  refreshButton.disabled = busy;
  scanButton.textContent = busy ? 'Scanning…' : 'Scan Markets';
};

const buildGroupHtml = (eventName, groupTitle, markets) => {
  const bestBid = Math.max(...markets.map((m) => asNumber(m.yes_bid) ?? -Infinity));
  const bestAsk = Math.min(...markets.map((m) => asNumber(m.yes_ask) ?? Infinity));
  const spread = (Number.isFinite(bestBid) && Number.isFinite(bestAsk)) ? bestAsk - bestBid : null;

  const rows = markets
    .map((market) => {
      const platform = escapeHtml(market.platform || 'Unknown');
      const last = formatCell(market.last_price);
      return `
        <tr>
          <td>${platform}</td>
          <td>${formatCell(market.yes_bid)}</td>
          <td>${formatCell(market.yes_ask)}</td>
          <td>${last}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <article class="group-card">
      <div class="group-heading">
        <p>${escapeHtml(eventName)}</p>
        <h4>${escapeHtml(groupTitle)}</h4>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Platform</th>
              <th>Yes Bid</th>
              <th>Yes Ask</th>
              <th>Last Price</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="group-heading">
        <p>Bid/Ask Spread</p>
        <h4 class="${spread !== null && spread <= 0.03 ? 'value-good' : ''}">${spread === null ? '-' : spread.toFixed(3)}</h4>
      </div>
    </article>
  `;
};

const fetchTopic = async (topic, apiKey) => {
  const endpoint = new URL(`${API_BASE}/search`);
  endpoint.searchParams.set('q', topic);
  endpoint.searchParams.set('limit', '6');

  const response = await fetch(endpoint, {
    headers: { 'X-API-Key': apiKey }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while loading "${topic}"`);
  }

  const payload = await response.json();
  if (payload.error) {
    throw new Error(payload.error);
  }

  return payload;
};

const renderEmpty = (message) => {
  resultsEl.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
};

const scan = async () => {
  const apiKey = apiKeyInput.value.trim();
  const topics = parseTopics();

  if (!apiKey) {
    setStatus('Enter your PredictionHunt API key to fetch live prices.', 'error');
    renderEmpty('Missing API key.');
    return;
  }

  if (!topics.length) {
    setStatus('Add at least one topic to scan.', 'error');
    renderEmpty('No topics provided.');
    return;
  }

  localStorage.setItem(API_KEY_STORAGE, apiKey);
  setBusy(true);
  setStatus('Loading live market data…');

  try {
    const responses = await Promise.all(topics.map((topic) => fetchTopic(topic, apiKey)));

    const seenPlatforms = new Set();
    let groupCount = 0;

    const topicCards = responses
      .map((response, index) => {
        const topic = topics[index];
        const groupsHtml = [];

        (response.events || []).forEach((event) => {
          (event.groups || []).forEach((group) => {
            const markets = (group.markets || []).filter((market) => market.platform);
            if (markets.length < 2) {
              return;
            }

            markets.forEach((market) => seenPlatforms.add(String(market.platform).toLowerCase()));
            groupCount += 1;
            groupsHtml.push(buildGroupHtml(event.event_name || topic, group.title || 'Untitled Group', markets));
          });
        });

        const badgeText = groupsHtml.length ? `${groupsHtml.length} market groups` : 'No matches';
        return `
          <section class="topic-card card">
            <div class="topic-header">
              <h3 class="topic-title">${escapeHtml(topic)}</h3>
              <span class="badge">${escapeHtml(badgeText)}</span>
            </div>
            ${groupsHtml.length ? groupsHtml.join('') : '<div class="empty">No cross-platform markets found for this topic.</div>'}
          </section>
        `;
      })
      .join('');

    resultsEl.innerHTML = topicCards;
    groupCountEl.textContent = String(groupCount);
    platformCountEl.textContent = String(seenPlatforms.size);

    setStatus(`Scan complete: ${groupCount} cross-platform groups found.`, 'success');
  } catch (error) {
    groupCountEl.textContent = '0';
    platformCountEl.textContent = '0';
    renderEmpty(error.message || 'Failed to load data from PredictionHunt API.');
    setStatus(error.message || 'Failed to load data.', 'error');
  } finally {
    setBusy(false);
  }
};

scanButton.addEventListener('click', scan);
refreshButton.addEventListener('click', scan);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    scan();
  }
});

apiKeyInput.value = localStorage.getItem(API_KEY_STORAGE) || '';
renderEmpty('Set your API key and click "Scan Markets" to load live data.');
