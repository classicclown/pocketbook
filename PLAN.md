# Pocketbook — Comprehensive Build Specification
> Hand this document to Claude Code to implement the full application.

---

## 1. Project Overview

**Pocketbook** is a personal budgeting Progressive Web App (PWA) for a single user (Ryan), hosted on GitHub Pages. It reads financial transaction data from Google Sheets and presents it through a clean, modern dashboard with 4 tabs. The app must be fully responsive — desktop uses a sidebar layout, mobile uses a bottom nav layout.

### Key Constraints
- Single user app — no auth required beyond Google Sheets API
- Data source is Google Sheets only — no database
- Must work as a PWA (installable on iPhone and Android home screen)
- Hosted on GitHub Pages (static files only, no server)
- Transactions are ingested automatically via a Gmail Apps Script trigger — the frontend is read-only
- Currency is ZAR (South African Rand) — display as "R" not "ZAR", except where currency column says USD in which case display as "$"

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite |
| Charts | Recharts |
| Styling | Inline styles using design tokens (no CSS framework) |
| Data | Google Sheets API v4 |
| Hosting | GitHub Pages |
| PWA | Vite PWA plugin (vite-plugin-pwa) |

### npm packages to install
```bash
npm install recharts
npm install vite-plugin-pwa
```

---

## 3. Project File Structure

```
pocketbook/
├── public/
│   ├── favicon.ico
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── tokens.js
│   ├── hooks/
│   │   └── useSheetData.js
│   ├── components/
│   │   ├── Layout.jsx
│   │   ├── Card.jsx
│   │   ├── ProgressBar.jsx
│   │   ├── StatCard.jsx
│   │   └── CustomTooltip.jsx
│   └── tabs/
│       ├── Overview.jsx
│       ├── Spending.jsx
│       ├── Analysis.jsx
│       └── Planning.jsx
├── index.html
├── vite.config.js
└── package.json
```

---

## 4. Design System

### 4.1 Tokens — `src/tokens.js`
```js
export const T = {
  // Backgrounds
  bg:        "#FAF9F7",    // page background
  surface:   "#FFFFFF",    // card background
  dim:       "#F0EDE8",    // muted fill, progress bar track

  // Borders
  border:    "#E8E4DF",    // default border
  border2:   "#D4CFC8",    // stronger border, inactive bars

  // Accent
  accent:    "#C1603A",    // terracotta — primary accent
  accentBg:  "#C1603A10",  // very light terracotta tint

  // Text
  text:      "#1A1714",    // primary text
  sub:       "#8C8480",    // secondary/muted text

  // Semantic
  green:     "#2D7A5F",    // positive, income, on track
  greenBg:   "#2D7A5F10",
  red:       "#B84040",    // negative, over budget
  redBg:     "#B8404010",
  yellow:    "#B07D2A",    // warning

  // Typography
  font:      "'Inter', -apple-system, sans-serif",
  mono:      "'JetBrains Mono', 'Fira Code', monospace",

  // Spacing
  radius:    6,            // border radius — use sparingly, max 8px
  radiusSm:  4,
};
```

### 4.2 Typography Scale
| Use | Size | Weight | Font |
|-----|------|--------|------|
| Page title | 28-30px | 700 | Inter |
| Section title | 13px | 600 | Inter |
| Label/uppercase | 10-11px | 500-600 | Inter, letter-spacing: 1.5px, uppercase |
| Body | 13px | 400 | Inter |
| Number large | 34-42px | 700 | JetBrains Mono |
| Number medium | 18-22px | 700 | JetBrains Mono |
| Number small | 13-14px | 600 | JetBrains Mono |

### 4.3 Component Patterns

**Cards** — white surface, 1px border, 6px radius, 16px padding, 12px bottom margin

**Progress bars** — flat (no border radius), 4px height for main bars, 3px for inline bars, track color is T.dim

**Buttons/chips** — 6px radius, no box shadow, clear active/inactive states

**Dividers** — 1px solid T.border

**Tooltips** — white background, T.border border, 4px radius, 8px padding, Inter font 11px, subtle box shadow

### 4.4 Responsive Breakpoint
- **Mobile:** < 768px — single column, bottom nav, compact padding
- **Desktop:** ≥ 768px — sidebar nav, 2-column grid, generous padding

Use a `useWindowWidth` hook or check `window.innerWidth` — but use a React state/effect pattern so it re-renders on resize:

```jsx
// In App.jsx or a hook
const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
useEffect(() => {
  const handler = () => setIsMobile(window.innerWidth < 768);
  window.addEventListener("resize", handler);
  return () => window.removeEventListener("resize", handler);
}, []);
```

Pass `isMobile` as a prop to all tab components.

---

## 5. Layout Component — `src/components/Layout.jsx`

### Props
| Prop | Type | Description |
|------|------|-------------|
| children | ReactNode | Tab content |
| activeTab | string | Current tab id |
| setActiveTab | function | Tab change handler |
| isMobile | boolean | Responsive flag |

### Nav Items
```js
const NAV_ITEMS = [
  { id: "overview",  label: "Overview",  icon: "⬡" },
  { id: "spending",  label: "Spending",  icon: "◫" },
  { id: "analysis",  label: "Analysis",  icon: "◉" },
  { id: "planning",  label: "Planning",  icon: "◎" },
];
```

### Desktop Sidebar (≥768px)
- Fixed position, left side, full height
- Width: 220px
- Background: T.surface, right border: T.border
- Top section: "Pocketbook" logo (18px, 700 weight) + "Personal Finance" subtitle (11px, T.sub)
- Nav items: full-width buttons, 10px/12px padding, 6px radius
  - Active state: T.accentBg background, T.accent color, 3px right accent bar indicator
  - Inactive: transparent, T.sub color
- Bottom of sidebar: current month label (e.g. "June 2026") in small uppercase
- Main content area has `marginLeft: 220px`

### Mobile Bottom Nav (<768px)
- Fixed position, bottom of screen
- Full width, background T.surface, top border T.border
- 4 equal-width buttons
- Each button: icon (18px) + label (9px uppercase)
- Active: T.accent color, thin 2px terracotta line above icon
- Inactive: T.sub color, 0.3 opacity icon
- Main content has `paddingBottom: 80px` to avoid overlap

---

## 6. Google Sheets Integration — `src/hooks/useSheetData.js`

### Google Sheets Setup
The app reads from a Google Sheet called **"RyCo Budget"** with 3 tabs:

#### Tab 1: "Ryan- Credit Card"
Columns (in order, 1-indexed):
1. `date` — string, format YYYY-MM-DD
2. `vendor` — string
3. `amount` — number (always positive, expenses are positive values)
4. `currency` — string, "ZAR" or "USD"
5. `card` — string e.g. "***1391"
6. `category` — string, may be blank
7. `subcategory` — string, may be blank

#### Tab 2: "Budgets"
Columns:
1. `category` — string
2. `monthly_limit` — number

#### Tab 3: "Assets"
Columns:
1. `asset` — string
2. `value` — number
3. `type` — "asset" or "liability"

### API Setup
- Use Google Sheets API v4
- The sheet must be published publicly (File → Share → Publish to web) OR use an API key
- API key approach (simpler for single user): store in `.env` as `VITE_GOOGLE_SHEETS_API_KEY`
- Spreadsheet ID stored in `.env` as `VITE_SPREADSHEET_ID`

### useSheetData Hook
```js
// Returns: { transactions, budgets, assets, loading, error, refetch }
// Fetches all 3 sheets on mount
// Re-expose a refetch() function for pull-to-refresh
// Parse rows: skip row 1 (headers), map remaining rows to objects
```

### Data Parsing Helpers
```js
// Parse transactions
const parseTransactions = (rows) => rows.slice(1).map(row => ({
  date:        row[0],
  vendor:      row[1],
  amount:      parseFloat(row[2]) || 0,
  currency:    row[3] || "ZAR",
  card:        row[4],
  category:    row[5] || "Uncategorised",
  subcategory: row[6] || "",
}));

// Parse budgets → object keyed by category
const parseBudgets = (rows) => rows.slice(1).reduce((acc, row) => {
  acc[row[0]] = parseFloat(row[1]) || 0;
  return acc;
}, {});

// Parse assets
const parseAssets = (rows) => rows.slice(1).map(row => ({
  asset: row[0],
  value: parseFloat(row[1]) || 0,
  type:  row[2], // "asset" or "liability"
}));
```

### Computed Values Helper (used across multiple tabs)
Create a `src/utils/compute.js` file:
```js
// Get transactions for a specific month
export const filterByMonth = (transactions, year, month) =>
  transactions.filter(t => {
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });

// Get all unique months from transactions, sorted newest first
export const getMonths = (transactions) => {
  const set = new Set(transactions.map(t => t.date.slice(0, 7)));
  return Array.from(set).sort().reverse();
};

// Sum expenses for a set of transactions
export const totalExpenses = (transactions) =>
  transactions.filter(t => t.currency === "ZAR").reduce((a, t) => a + t.amount, 0);

// Sum by category
export const sumByCategory = (transactions) =>
  transactions.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = 0;
    acc[t.category] += t.amount;
    return acc;
  }, {});

// Sum by vendor
export const sumByVendor = (transactions) =>
  transactions.reduce((acc, t) => {
    if (!acc[t.vendor]) acc[t.vendor] = 0;
    acc[t.vendor] += t.amount;
    return acc;
  }, {});

// Net worth
export const calcNetWorth = (assets) => {
  const totalAssets = assets.filter(a => a.type === "asset").reduce((s, a) => s + a.value, 0);
  const totalLiabilities = assets.filter(a => a.type === "liability").reduce((s, a) => s + a.value, 0);
  return { totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities };
};

// Format currency
export const fmt = (n, currency = "ZAR") => {
  const prefix = currency === "USD" ? "$" : "R";
  return `${prefix} ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
```

---

## 7. Tab Specifications

### 7.1 Overview Tab — `src/tabs/Overview.jsx`

**Props:** `{ transactions, budgets, assets, isMobile }`

**Layout:** 2-column grid on desktop, single column on mobile

#### Sections (top to bottom):

**A. Header**
- Small uppercase label: current month + year (e.g. "June 2026")
- Large greeting: "Good morning, Ryan"

**B. Net Worth Banner** (full width, spans both columns on desktop)
- Dark background (T.text = #1A1714)
- Large monospace number: net worth in Rands
- Sub-row: Assets total | Liabilities total | "▲/▼ R X this month" (compare to previous month)
- Month-over-month change in T.accent color

**C. Stats Row** — 3 equal cards side by side (even on mobile)
- **Income:** sum of transactions where category === "Income" for current month
- **Spent:** sum of all non-income ZAR transactions for current month
- **Saved:** Income minus Spent
- Each shows a secondary line: Spent shows "vs last month %" in green/red, Saved shows savings rate %

**D. Savings Rate**
- Label + large % number in T.green
- Target line at 30%
- Flat progress bar
- Sub-label: "X% above/below target"

**E. Projected Spend**
- Label + "R X / R Y" on right
- Flat progress bar — turns T.red when > 90%
- Sub-label: "X% of monthly budget · N days remaining"
- Projection logic: (current spend / days elapsed) × days in month

**F. 6-Month Spending Bar Chart**
- Recharts BarChart
- Shows last 6 calendar months
- Current month bar in T.accent, all others in T.border2
- Y-axis formatted as "Xk"
- Custom tooltip (white card, no border-radius, T.border border)

**G. Budget vs Actual List**
- Card with header "Budget vs Actual" + current month label
- For each category in Budgets sheet:
  - Category name | "R actual / R budget" right-aligned
  - Flat 3px progress bar below
  - Over budget: bar turns T.red, shows "OVER" tag
  - On track: bar is T.accent at opacity 0.7

---

### 7.2 Spending Tab — `src/tabs/Spending.jsx`

**Props:** `{ transactions, budgets, isMobile }`

**This is the most interactive tab. It has two levels:**
1. Monthly overview (default)
2. Drilled-down month view (when a month is selected)

#### Top Section — Chart/Table Toggle
- Two chips: "Chart" | "Table" — toggle between views
- When a month is selected, also show: "✕ Clear" button right-aligned + month label

#### Chart View (default)
- Recharts BarChart showing monthly totals for all available months
- Bars: T.border2 by default, T.accent for selected month, T.yellow for current month if not selected
- **Clickable bars** — clicking a bar selects that month and triggers drill-down
- Bar size: 28px, radius: [2,2,0,0]

#### Table View
- Simple table: Month | Total Spent
- Rows are clickable — clicking selects that month
- Selected row has T.accentBg background

#### Drill-Down (when month is selected)

**Chart updates to show breakdown:**
- Toggle chips appear: "Category" | "Vendor"
- Chart re-renders showing category or vendor breakdown for selected month
- In Category mode: dashed reference lines at each category's budget limit
- Bars over budget render in T.red

**Budget vs Actual summary card** (only in Category drill-down mode):
- Shows each category: name | "R actual / R budget" | over/under indicator

#### Transaction List (below chart, always visible)
- Header: "Transactions · [Month]" + item count
- Group by chips: "No grouping" | "Category" | "Vendor"
- When grouped: show group header with group name + total spend for group

**Transaction Row:**
- Left: icon (💰 income, 🔄 recurring, 💳 regular) + vendor name + date + category
- Right: amount (green for income, T.text for expense)
- Tapping/clicking expands the row

**Expanded Transaction Row:**
- Shows: subcategory, card used
- Tag picker: "Business" | "Holiday" | "One-off" | "Irregular"
- Tags stored in localStorage keyed by `${date}-${vendor}-${amount}`
- Selected tag shown as small pill on the collapsed row

---

### 7.3 Analysis Tab — `src/tabs/Analysis.jsx`

**Props:** `{ transactions, isMobile }`

#### Section A — Trend Line Chart
- Three toggle chips: "Spending" | "Savings" | "Net Worth"
- Recharts LineChart showing selected metric over all available months
- Line: T.accent color, 2.5px stroke, dots at each point
- Grid: horizontal only, T.border dashed
- Custom tooltip

**Metric calculations:**
- Spending: total ZAR expenses per month
- Savings: income minus expenses per month
- Net Worth: cumulative — requires Assets sheet + running savings total

**Above chart:** large current month value + "vs previous month" delta in green/red

#### Section B — Monthly Savings Rate Bars
- For each month (newest first): month label | horizontal bar | percentage
- Bar fill: gradient from T.accent to T.green
- Bar width proportional to savings rate (max width = 100%)

#### Section C — Category Comparison
- Header: "Category Trends · [prev month] vs [current month]"
- For each category:
  - Color dot + category name
  - "R prev → R current" + percentage change in green (down) or red (up)

---

### 7.4 Planning Tab — `src/tabs/Planning.jsx`

**Props:** `{ transactions, assets, isMobile }`

> Note: Savings goals and milestones are hardcoded initially (no Sheets tab for these yet). Add a "Goals" sheet later.

#### Section A — Savings Goals
- Section header: "Savings Goals"
- Each goal is a card:
  - Icon + goal name + deadline date
  - Large percentage complete (T.accent)
  - Amount saved / target amount
  - Flat progress bar in goal's color
  - Tapping expands to show: remaining amount, monthly contribution needed to hit deadline

**Initial hardcoded goals:**
```js
const GOALS = [
  { name: "Emergency Fund",   target: 20000, saved: 14500, deadline: "Mar 2027", icon: "🛡️", color: T.green },
  { name: "Holiday",          target: 8000,  saved: 3200,  deadline: "Dec 2026", icon: "✈️", color: T.accent },
  { name: "New Laptop",       target: 3500,  saved: 1200,  deadline: "Sep 2026", icon: "💻", color: "#7C6FCD" },
];
```

#### Section B — Net Worth Forecast
- Section header: "Net Worth Forecast"
- Recharts LineChart with two lines:
  - **Projected** (dashed, T.yellow): assumes current monthly savings rate continues
  - **Conservative** (solid, T.accent): assumes 20% lower savings rate
- X-axis: next 12 months
- Legend below chart

**Forecast calculation:**
```js
// Use average monthly savings over last 3 months as baseline
// Projected = netWorth + (avgMonthlySavings * month)
// Conservative = netWorth + (avgMonthlySavings * 0.8 * month)
```

#### Section C — Milestones
- Section header: "Milestones"
- Checklist of named financial milestones
- Completed items: strikethrough text, green checkmark circle
- Incomplete: empty circle

**Initial hardcoded milestones:**
```js
const MILESTONES = [
  { label: "First R50k net worth",   done: false, date: "Target: Dec 2026" },
  { label: "6-month emergency fund", done: false, date: "Target: Mar 2027" },
  { label: "Pay off credit card",    done: true,  date: "Completed Apr 2026" },
];
```

---

## 8. Shared Components

### `src/components/Card.jsx`
```jsx
// Props: children, style, accent (optional border color)
// White background, T.border border, 6px radius, 16px padding, 12px bottom margin
```

### `src/components/ProgressBar.jsx`
```jsx
// Props: value (0-100), color, trackColor, height (default 4)
// Flat bar, no border radius on fill or track
```

### `src/components/StatCard.jsx`
```jsx
// Props: label, value, subValue, subColor
// Used for Income/Spent/Saved cards
// White bg, T.border border, 6px radius, 12-16px padding
```

### `src/components/CustomTooltip.jsx`
```jsx
// Recharts custom tooltip
// Props: active, payload, label
// White bg, T.border border, no border-radius, subtle shadow
// Shows label (month/category) + formatted value
```

---

## 9. App.jsx Structure

```jsx
import { useState, useEffect } from "react";
import Layout from "./components/Layout";
import Overview from "./tabs/Overview";
import Spending from "./tabs/Spending";
import Analysis from "./tabs/Analysis";
import Planning from "./tabs/Planning";
import { useSheetData } from "./hooks/useSheetData";

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { transactions, budgets, assets, loading, error, refetch } = useSheetData();

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const tabProps = { transactions, budgets, assets, isMobile };

  const renderTab = () => {
    if (loading) return <LoadingState />;
    if (error) return <ErrorState error={error} onRetry={refetch} />;
    switch (activeTab) {
      case "overview":  return <Overview {...tabProps} />;
      case "spending":  return <Spending {...tabProps} />;
      case "analysis":  return <Analysis {...tabProps} />;
      case "planning":  return <Planning {...tabProps} />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} isMobile={isMobile}>
      {renderTab()}
    </Layout>
  );
}
```

### Loading State
- Centered spinner or skeleton cards
- Use T.dim background blocks as skeleton placeholders

### Error State
- Simple centered message: "Couldn't load data"
- Retry button in T.accent

---

## 10. PWA Configuration

### vite.config.js
```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/pocketbook/",  // GitHub Pages repo name
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Pocketbook",
        short_name: "Pocketbook",
        description: "Personal finance dashboard",
        theme_color: "#FAF9F7",
        background_color: "#FAF9F7",
        display: "standalone",
        orientation: "portrait",
        icons: [
          { src: "/pocketbook/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pocketbook/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
});
```

### index.html — add to `<head>`
```html
<link rel="manifest" href="/pocketbook/manifest.webmanifest" />
<meta name="theme-color" content="#FAF9F7" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Pocketbook" />
<link rel="apple-touch-icon" href="/pocketbook/icons/icon-192.png" />
```

---

## 11. Environment Variables

Create a `.env` file in the project root (do NOT commit to GitHub):
```
VITE_GOOGLE_SHEETS_API_KEY=your_api_key_here
VITE_SPREADSHEET_ID=your_spreadsheet_id_here
```

Create a `.env.example` file (safe to commit):
```
VITE_GOOGLE_SHEETS_API_KEY=
VITE_SPREADSHEET_ID=
```

Add `.env` to `.gitignore`.

---

## 12. Google Sheets API Setup Instructions

1. Go to console.cloud.google.com
2. Create a new project called "Pocketbook"
3. Enable the **Google Sheets API**
4. Create an **API Key** under Credentials
5. Restrict the API key to Google Sheets API only
6. In Google Sheets: File → Share → Publish to web (makes sheet publicly readable)
7. Copy the Spreadsheet ID from the URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
8. Add both values to `.env`

### Fetch URL pattern
```
https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID}/values/{SHEET_NAME}?key={API_KEY}
```

---

## 13. GitHub Pages Deployment

### Setup (one time)
```bash
npm install --save-dev gh-pages
```

Add to `package.json` scripts:
```json
"predeploy": "npm run build",
"deploy": "gh-pages -d dist"
```

### Deploy
```bash
npm run deploy
```

App will be live at: `https://[github-username].github.io/pocketbook/`

### On GitHub
- Go to repo Settings → Pages
- Set source to `gh-pages` branch

---

## 14. Transaction Ingestion (Already Built — Do Not Rebuild)

The backend pipeline is already working:

**Gmail Apps Script** (runs every 5 minutes):
- Watches for unread emails from `no-reply@discovery.bank`
- Parses: date (from email metadata), vendor (from email body), amount, currency, card
- Duplicate check before writing
- Appends to "Ryan- Credit Card" tab in "RyCo Budget" Google Sheet
- Category and subcategory columns left blank for manual entry

**Email format:**
```
Card payment
[VENDOR NAME] +[PHONE?] – [CURRENCY] [AMOUNT]
From ***[ACCOUNT]
Card ending ***[CARD]
[DAY], [DATE] [MONTH] at [TIME]
Available balance: R [BALANCE]
```

**Parsed fields:**
- Date → from `message.getDate()` (not body)
- Vendor → text before ` – `, strip trailing ` +[digits]`
- Currency → "R" normalised to "ZAR", or USD/EUR/GBP
- Amount → numeric
- Card → `***XXXX`

---

## 15. Build Order Recommendation for Claude Code

1. Set up tokens, utils/compute.js, and shared components first
2. Build Layout.jsx with nav (use placeholder tab content to verify responsive behaviour)
3. Build useSheetData hook with mock data fallback (so UI can be built before API is connected)
4. Build Overview tab (most complex, sets the visual pattern for the rest)
5. Build Spending tab (most interactive)
6. Build Analysis tab
7. Build Planning tab
8. Connect real Google Sheets data via useSheetData hook
9. Add PWA config
10. Deploy to GitHub Pages

---

## 16. Mock Data (for development before Sheets is connected)

```js
export const MOCK_TRANSACTIONS = [
  { date:"2026-06-05", vendor:"Woolworths Food", amount:199.03, currency:"ZAR", card:"***1391", category:"Groceries", subcategory:"Food" },
  { date:"2026-06-04", vendor:"Vida e Caffè", amount:58.00, currency:"ZAR", card:"***1391", category:"Dining", subcategory:"Coffee" },
  { date:"2026-06-03", vendor:"Netflix", amount:199.00, currency:"ZAR", card:"***1391", category:"Entertainment", subcategory:"Streaming" },
  { date:"2026-06-02", vendor:"Shell Garage", amount:850.00, currency:"ZAR", card:"***1391", category:"Transport", subcategory:"Fuel" },
  { date:"2026-06-01", vendor:"Salary", amount:48000.00, currency:"ZAR", card:"***1391", category:"Income", subcategory:"Salary" },
  { date:"2026-06-01", vendor:"Discovery Health", amount:2100.00, currency:"ZAR", card:"***1391", category:"Health", subcategory:"Insurance" },
  { date:"2026-05-30", vendor:"Checkers Sea Point", amount:432.10, currency:"ZAR", card:"***1391", category:"Groceries", subcategory:"Food" },
  { date:"2026-05-28", vendor:"Mr D Food", amount:189.00, currency:"ZAR", card:"***1391", category:"Dining", subcategory:"Delivery" },
  { date:"2026-05-27", vendor:"Uber", amount:145.00, currency:"ZAR", card:"***1391", category:"Transport", subcategory:"Rideshare" },
  { date:"2026-05-26", vendor:"Salary", amount:48000.00, currency:"ZAR", card:"***1391", category:"Income", subcategory:"Salary" },
  { date:"2026-05-25", vendor:"SP THE HEAVY MARKET", amount:1543.00, currency:"USD", card:"***8589", category:"Dining", subcategory:"Restaurant" },
  { date:"2026-04-30", vendor:"Woolworths Food", amount:312.50, currency:"ZAR", card:"***1391", category:"Groceries", subcategory:"Food" },
  { date:"2026-04-28", vendor:"Salary", amount:48000.00, currency:"ZAR", card:"***1391", category:"Income", subcategory:"Salary" },
];

export const MOCK_BUDGETS = {
  Groceries: 4000,
  Dining: 3500,
  Transport: 2500,
  Entertainment: 1200,
  Health: 3000,
  Utilities: 2000,
};

export const MOCK_ASSETS = [
  { asset: "Savings Account", value: 320000, type: "asset" },
  { asset: "Investment Account", value: 180000, type: "asset" },
  { asset: "Vehicle", value: 120000, type: "asset" },
  { asset: "Home Loan", value: 450000, type: "liability" },
  { asset: "Credit Card", value: 8500, type: "liability" },
];
```

> Note: Amounts are in ZAR so multiply previous mock values by ~18 for realistic South African figures.

---

## 17. Notes & Gotchas

- All amounts in the sheet are **positive numbers** — the app determines income vs expense by checking `category === "Income"`
- USD transactions should display with "$" prefix and show the original USD amount — do not convert
- Discovery Bank vendor names are truncated by the bank — this is expected, do not try to fix
- The sheet name has a space and hyphen: `"Ryan- Credit Card"` — make sure URL encoding is correct when fetching
- Tags are stored in `localStorage` since they're not in the sheet — key format: `tag_${date}_${vendor}_${amount}`
- `window.innerWidth` check for `isMobile` must be in a useEffect/useState pattern or it won't respond to window resize
- GitHub Pages requires the `base` in vite.config.js to match the repo name exactly
- The `.env` file must never be committed — add it to `.gitignore` before first commit