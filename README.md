# arbitrage

A static dashboard that mirrors the highest ROI percentages from PredictionHunt arbitrage.

## Run locally

Open `/home/runner/work/arbitrage/arbitrage/index.html` in a browser.

## Dashboard access

1. Enter the dashboard code in the **Access Code** field.
2. Click **Unlock Dashboard**.
3. Click **Refresh ROI** to pull the latest top ROI rates from `https://www.predictionhunt.com/arbitrage`.

The current client-side code is configured in `/home/runner/work/arbitrage/arbitrage/app.js` as:

- `ACCESS_CODE` for dashboard unlock.
- `ARBITRAGE_URL` for source data.

## GitHub Pages deployment

This repository includes a GitHub Pages workflow at:

- `/home/runner/work/arbitrage/arbitrage/.github/workflows/deploy-pages.yml`

To publish:

1. In GitHub, go to **Settings → Pages**.
2. Set **Source** to **GitHub Actions**.
3. Push to `main` and the workflow will deploy the static site automatically.
