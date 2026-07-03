# Pocketbook

Personal finance PWA: a React + Vite frontend backed by a Google Sheet, with a
Google Apps Script doing Gmail transaction ingest and serving as the read/write
API. Deployed to GitHub Pages under `/pocketbook/`.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173 — proxies the Apps Script via /google-script
npm run build      # production build (PWA)
npm run preview    # serve the build locally
npm run deploy     # publish dist/ to gh-pages
```

`.env` must contain `VITE_SCRIPT_URL=<Apps Script /exec URL>`. Without it the
app runs on mock data (Settings writes are disabled).

## Architecture

- **Styling** — no CSS framework; inline styles fed by theme tokens
  (`src/theme/tokens.js`). Light/dark themes served through
  `src/theme/ThemeContext.jsx` (`useTheme()` → `{ T, mode, preference, setPreference }`);
  preference persists in localStorage `pb:themePref`, default follows the OS.
- **Layout** — `src/components/Layout.jsx`: sidebar on desktop, bottom nav on
  mobile, breakpoint via `useIsMobile()` (`src/hooks/useMediaQuery.js`).
- **Data** — `src/hooks/useSheetData.js` fetches all sheet tabs through
  `src/api/sheet.js` and exposes optimistic write actions.
- **Tags** — per-transaction tags live in localStorage behind a reactive store
  (`src/hooks/useTags.js`). Tagging a transaction **One-off**/**Holiday** keeps
  it in actuals but excludes it from spend projections (`src/utils/projection.js`).
- **Feature utilities** — `src/utils/insights.js` (category 3-month average,
  merchant stats, top movers), `src/utils/recurring.js` (subscription
  detection + left-to-spend inputs).

## Google Sheet schema (spreadsheet: "RyCo budget")

| Tab | Columns | Written by |
|---|---|---|
| `Ryan-Credit Card` | Date, Description, Amount, Currency, Main Category, Sub Category, Amount ZAR, Merchant Key | Gmail ingest (script) |
| `Budgets` | Category, Limit | Settings → doubles as envelope allocations |
| `Assets` | Asset, Value, Type (asset/liability) | manual |
| `Settings` | Key, Value (e.g. `envelopeMode`, `TRUE`) | Settings screen |
| `Goals` | Name, Target, Saved, Deadline, Icon | Settings screen |
| `Watchlists` | Name, Type (category/vendor), Match, MonthlyLimit | Settings screen |
| `NetWorthHistory` | Date, Assets, Liabilities, Net | monthly `snapshotNetWorth` trigger |

Missing tabs are created on first write; reads of missing tabs return `[]`.

## Apps Script API (`script.txt`)

```
GET  {SCRIPT_URL}?sheet=transactions|budgets|assets|settings|goals|watchlists|networth
  → 2D array (header row first)

POST {SCRIPT_URL}   body = JSON string, sent with NO Content-Type header
  { "action": "setSetting",    "key": "...", "value": "..." }
  { "action": "setBudgets",    "budgets": { "Groceries": 4000 } }
  { "action": "setGoals",      "goals": [{ name, target, saved, deadline, icon }] }
  { "action": "setWatchlists", "watchlists": [{ name, type, match, monthlyLimit }] }
  → { "ok": true } | { "ok": false, "error": "..." }
```

`setBudgets`/`setGoals`/`setWatchlists` rewrite all data rows below the header
(single-user, whole-list saves).

### Redeploy checklist (required after every script edit)

1. Copy `script.txt` into the Apps Script editor (script.google.com).
2. **Deploy → Manage deployments → ✏️ edit → Version: New version → Deploy.**
   Saving the file alone does NOT update the `/exec` URL.
3. Run `setupTriggers()` once from the editor to install the monthly
   net-worth snapshot (and run `snapshotNetWorth()` manually for the first data point).

### Gotchas

- **"CORS errors" are almost never CORS.** If the browser reports a CORS
  failure, `doGet`/`doPost` threw and returned a Google HTML error page.
  Debug with `curl -L "$SCRIPT_URL?sheet=transactions"` first.
- **Never send `Content-Type: application/json`** to the script — it triggers
  a preflight `OPTIONS` request that Apps Script cannot answer. The client
  sends the JSON body as text/plain (browser default).
- Spend math excludes `Income` and `Transfer` categories (credit-card
  settlements/EFT moves are money movement, not consumption).
