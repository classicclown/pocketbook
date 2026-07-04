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
| `Ryan-Credit Card` | Date, Description, Amount, Currency, Main Category, Sub Category, Amount ZAR, Merchant Key | Gmail ingest (script, auto-categorized) |
| `Budgets` | Category, Limit | Settings → doubles as envelope allocations |
| `Assets` | Asset, Value, Type (asset/liability) | manual |
| `Settings` | Key, Value (`envelopeMode`, `stackedChart`) | Settings screen |
| `Goals` | Name, Target, Saved, Deadline, Icon | Settings screen |
| `Watchlists` | Name, Type (category/vendor), Match, MonthlyLimit | Settings screen |
| `NetWorthHistory` | Date, Assets, Liabilities, Net | monthly `snapshotNetWorth` trigger |
| `Mapping` | Key, Category, Subcategory | in-app teach loop + `seedMapping()` |
| `Fixed` | Name, Amount, Category, Subcategory, Day, Active | Settings screen (monthly template, synthesized into every month) |
| `Investments` | Ticker, Name, Units, Price, Value, Notes | manual — Price/Value may be GOOGLEFINANCE formulas; unlisted funds type Value directly |

Missing tabs are created on first write; reads of missing tabs return `[]`.

### Auto-categorization

New Gmail-ingested transactions are vendor-normalized (YOCO/SQ/Zapper etc.
prefixes stripped) and matched against the `Mapping` tab: case-insensitive
substring, longest key first — so `woolworths` catches every branch and a
short key like `pharm` acts as a keyword rule. Unmatched transactions show
in the app's "uncategorised — review" banner (Spending); teaching a category
there appends a Mapping row and backfills all matching rows.

Run-once helpers in the Apps Script editor:
- `seedMapping()` — seeds ~150 common SA merchants/keywords (never overwrites your rows).
- `categorizeBacklog()` — fills blank categories on existing rows (leaves categorized rows alone).
- `normalizeBacklog()` — optional vendor cleanup for old rows; note it orphans
  localStorage tags/recurring-exclusions keyed by the old vendor names.

## Apps Script API (`script.txt`)

```
GET  {SCRIPT_URL}?sheet=transactions|budgets|assets|settings|goals|watchlists
                       |networth|mapping|fixed|investments
  → 2D array (header row first)

POST {SCRIPT_URL}   body = JSON string, sent with NO Content-Type header
  { "action": "setSetting",    "key": "...", "value": "..." }
  { "action": "setBudgets",    "budgets": { "Groceries": 4000 } }
  { "action": "setGoals",      "goals": [{ name, target, saved, deadline, icon }] }
  { "action": "setWatchlists", "watchlists": [{ name, type, match, monthlyLimit }] }
  { "action": "setFixed",      "fixed": [{ name, amount, category, subcategory, day, active }] }
  { "action": "addMapping",    "key": "...", "category": "...", "subcategory": "..." }
  → { "ok": true } | { "ok": false, "error": "..." }   (addMapping also returns "updated": n)
```

`setBudgets`/`setGoals`/`setWatchlists`/`setFixed` rewrite all data rows below
the header (single-user, whole-list saves). `addMapping` appends and backfills.

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
