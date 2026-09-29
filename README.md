# AI Loan Eligibility Checker

A polished, single-page BFSI demo for the NASSCOM **AI Specialist BFSI** project. ClearPath Fintech combines a rule-based loan eligibility checker, directional credit score analyzer, real-time EMI calculator, AI financial tips chat, and consent-gated history.

> **Disclaimer:** Results are estimates only and not an actual bank approval. The product is educational and not official financial advice. Never enter PAN, Aadhaar, bank-account numbers, passwords, OTPs or other sensitive identity data.

## Included features

- Dark glassmorphism fintech UI with responsive desktop, tablet and mobile layouts.
- Eligibility rules for age, credit score, employment, minimum income, FOIR, score bands, affordable principal, estimated EMI, animated gauge and score breakdown.
- Credit score estimate using payment history (35%), utilization (30%), history length (15%), credit mix (10%) and enquiries (10%).
- EMI calculation using `EMI = P × r × (1+r)^n / ((1+r)^n - 1)`, principal/interest donut chart and amortization table.
- Claude chat UI with chips, typing state, calculator context, secure proxy contract, and offline-friendly fallback advice.
- Google Sheets `doGet` / `doPost` script plus localStorage fallback; records are only saved after consent.
- Mermaid workflow diagram source and rendered PNG.

## Run locally

Requirements: Node.js 20+.

```bash
cp .env.example .env
# export the values in your shell or use your preferred env loader
npm run test
npm start
```

Open `http://localhost:3000`. The AI chat works in fallback mode until `ANTHROPIC_API_KEY` is configured. The history stays in the browser until `SHEETS_WEB_APP_URL` is configured.

## Environment variables

Set these in your hosting provider's **server/runtime environment**, never in frontend JavaScript:

| Variable | Required | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Optional for demo; required for live AI | Server-only Anthropic API key. |
| `CLAUDE_MODEL` | Optional | Claude model identifier; defaults to `claude-3-7-sonnet-latest`, override with the latest model available to your account. |
| `SHEETS_WEB_APP_URL` | Optional | Google Apps Script web app URL. |
| `PUBLIC_ORIGIN` | Optional | Deployed public origin used for allowlisting. |
| `ALLOWED_ORIGINS` | Optional | Comma-separated allowed origins; keep this limited to deployed domains. |
| `PORT` | Optional | Listener port; managed hosting injects its own value. |

## Google Sheets setup

1. Create a Google Sheet and open **Extensions → Apps Script**.
2. Replace the editor contents with [`google-apps-script/Code.gs`](google-apps-script/Code.gs).
3. Save and run `setup_` once from the Apps Script editor if you want the header row created immediately; authorize the script.
4. Choose **Deploy → New deployment → Web app**.
5. Set **Execute as: Me** and **Who has access: Anyone** (or the narrowest access policy appropriate for your deployment).
6. Copy the `/exec` web app URL into the deployment environment as `SHEETS_WEB_APP_URL` and, for a static-only deployment, also set the browser config value in `js/app.js` to that URL.
7. The site sends only the documented history fields. Do not add PAN, Aadhaar or bank-account columns.

The saved row contract is: `timestamp`, `name`, `email`, `age`, `employment`, `income`, `existingEmi`, `creditScore`, `loanType`, `loanLabel`, `loanAmount`, `tenure`, `band`, `eligibilityResult`, `score`, `maxEligible`, and `estimatedCreditScore`.

For a production rollout, place the Sheets call behind your own serverless route and add authentication, abuse controls and a database rather than exposing a public write endpoint.

## Claude proxy

`netlify/functions/claude.js` keeps the API key server-side, validates prompt size, restricts origins, sets a timeout, handles provider/rate-limit errors and uses a BFSI-specific system prompt. Netlify routes `/api/claude` to the function. The managed-hosting adapter uses the same `proxyClaude` function from `server.js`.

For local development, the proxy permits only `http://localhost:3000` and `http://127.0.0.1:3000` by default. For a published deployment, set `PUBLIC_ORIGIN` or `ALLOWED_ORIGINS` to the exact HTTPS origin(s); unspecified origins are rejected.

If your Anthropic account uses a newer model name, set `CLAUDE_MODEL` without changing the frontend. Never commit `.env` or a real key.

## Netlify deployment

```bash
npm install
npm run test
npm run build
```

Import the repository into Netlify. `netlify.toml` sets the build command, `dist` publish directory, function directory, API redirect, SPA fallback and basic security headers. Add `ANTHROPIC_API_KEY`, `CLAUDE_MODEL`, `SHEETS_WEB_APP_URL`, `PUBLIC_ORIGIN` and `ALLOWED_ORIGINS` in Site configuration → Environment variables, then redeploy.

## Managed Web Dev deployment

The project includes `Dockerfile`, `server.js`, the static build script, route manifest and same-origin API health endpoint. The app listens on `0.0.0.0:$PORT`, returns `GET /api/health`, and serves `GET /manus-routes.json` from the origin root. Configure the production secret values through the host's protected secret input, save a checkpoint, then publish the checkpoint.

## Tests

`npm test` checks the reference EMI case (₹5,00,000 at 10% for 60 months ≈ ₹10,624), zero-interest EMI, age 20/21/60/61 behavior, score 599/600, FOIR below/above 50%, unemployed hard stop, and credit score range/order.

## Future enhancements

- Authentication and per-user encrypted history.
- ML prediction models calibrated on approved, anonymized portfolio data.
- PDF report generation with lender comparison and a shareable summary.
- Multi-language support for Hindi and additional Indian languages.
- Accessibility audit, lender-specific policy packs, consent receipts and a privacy dashboard.
