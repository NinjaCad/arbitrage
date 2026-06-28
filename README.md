# arbitrage

A static **Arbitrage Viewer for Prediction Markets** dashboard.

## Run locally

Open `/home/runner/work/arbitrage/arbitrage/index.html` in a browser.

## Access flow

1. Open the access page at `index.html`.
2. Enter the dashboard access code.
3. You are redirected to `dashboard.html`.
4. Click **Refresh ROI** to pull the latest top ROI rates from `https://www.predictionhunt.com/arbitrage`.

The client-side code is configured in `/home/runner/work/arbitrage/arbitrage/app.js` as:

- `ACCESS_CODE` for dashboard unlock.
- `ARBITRAGE_URL` for source data.

## GitHub Pages deployment

This repository includes a GitHub Pages workflow at:

- `/home/runner/work/arbitrage/arbitrage/.github/workflows/deploy-pages.yml`

To publish:

1. In GitHub, go to **Settings → Pages**.
2. Set **Source** to **GitHub Actions**.
3. Push to `main` and the workflow will deploy the static site automatically.
