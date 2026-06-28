const ACCESS_KEY = 'arbitrage-pro-unlocked';
const ACCESS_CODE = 'ARBITRAGE-PRO';

const sampleRows = [
  { market: 'US Election Winner', sideA: 0.47, sideB: 0.50 },
  { market: 'Fed Rate Cut by Sep', sideA: 0.44, sideB: 0.53 },
  { market: 'BTC > $100k this year', sideA: 0.46, sideB: 0.49 },
  { market: 'S&P 500 closes green', sideA: 0.48, sideB: 0.50 }
];

const paywall = document.getElementById('paywall');
const dashboard = document.getElementById('dashboard');
const rows = document.getElementById('rows');
const unlockButton = document.getElementById('unlockButton');
const submitCode = document.getElementById('submitCode');
const accessCode = document.getElementById('accessCode');
const unlockError = document.getElementById('unlockError');
const unlockPanel = document.getElementById('unlockPanel');
const lockButton = document.getElementById('lockButton');

function setAccessState(unlocked) {
  if (unlocked) {
    localStorage.setItem(ACCESS_KEY, '1');
    paywall.classList.add('hidden');
    dashboard.classList.remove('hidden');
    renderRows();
    return;
  }

  localStorage.removeItem(ACCESS_KEY);
  dashboard.classList.add('hidden');
  paywall.classList.remove('hidden');
}

function renderRows() {
  rows.innerHTML = sampleRows
    .map(({ market, sideA, sideB }) => {
      const total = sideA + sideB;
      const edge = (1 - total) * 100;
      return `
        <tr>
          <td>${market}</td>
          <td>${(sideA * 100).toFixed(1)}%</td>
          <td>${(sideB * 100).toFixed(1)}%</td>
          <td>${(total * 100).toFixed(1)}%</td>
          <td class="edge-positive">${edge.toFixed(1)}%</td>
        </tr>
      `;
    })
    .join('');
}

unlockButton.addEventListener('click', () => {
  unlockPanel.classList.remove('hidden');
  accessCode.focus();
});

submitCode.addEventListener('click', () => {
  const valid = accessCode.value.trim().toUpperCase() === ACCESS_CODE;
  unlockError.classList.toggle('hidden', valid);
  if (valid) {
    setAccessState(true);
  }
});

lockButton.addEventListener('click', () => setAccessState(false));

setAccessState(localStorage.getItem(ACCESS_KEY) === '1');
