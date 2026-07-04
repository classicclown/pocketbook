import { useState, useEffect, useCallback } from "react";
import {
  MOCK_TRANSACTIONS, MOCK_BUDGETS, MOCK_ASSETS,
  MOCK_GOALS, MOCK_WATCHLISTS, MOCK_NETWORTH, MOCK_FIXED, MOCK_INVESTMENTS,
} from "../utils/compute";
import { fetchSheet, postAction, useMock } from "../api/sheet";

// Sheets returns date cells as Date objects → ISO timestamps like
// "2025-08-19T22:00:00.000Z" (SA midnight = 22:00 UTC). Recover the local
// calendar date by shifting +2h, then take YYYY-MM-DD.
function normalizeDate(raw) {
  if (!raw) return "";
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return String(raw).slice(0, 10);
  return new Date(d.getTime() + 2 * 3600 * 1000).toISOString().slice(0, 10);
}

// Sheet columns: Date | Description | Amount | Currency | Main Category |
// Sub Category | Amount ZAR | Merchant Key
// `amount` is always the ZAR-equivalent (Amount ZAR column, falling back to the
// original amount when blank) so all math is in one currency. The original
// amount + currency are kept for display only. Income is distinguished by category.
const parseTransactions = (rows) => rows.slice(1).map(row => {
  const original = parseFloat(row[2]) || 0;
  const zar      = parseFloat(row[6]);
  return {
    date:           normalizeDate(row[0]),
    vendor:         row[1] || "",
    amount:         Number.isFinite(zar) ? zar : original,
    originalAmount: original,
    currency:       row[3] || "ZAR",
    card:           "",
    category:       row[4] || "Uncategorised",
    subcategory:    row[5] || "",
  };
}).filter(t => t.date);

const parseBudgets = (rows) => rows.slice(1).reduce((acc, row) => {
  if (row[0]) acc[row[0]] = parseFloat(row[1]) || 0;
  return acc;
}, {});

const parseAssets = (rows) => rows.slice(1).map(row => ({
  asset: row[0] || "",
  value: parseFloat(row[1]) || 0,
  type:  row[2] || "asset",
})).filter(a => a.asset);

// Settings tab is key | value rows. Non-array responses (older deployed
// script versions answer unknown sheets with { error }) fall back to defaults.
const parseSettings = (rows) => {
  if (!Array.isArray(rows)) return DEFAULT_SETTINGS;
  const raw = {};
  rows.slice(1).forEach(row => {
    if (row[0]) raw[String(row[0])] = String(row[1] ?? "");
  });
  return {
    envelopeMode: (raw.envelopeMode || "").toLowerCase() === "true",
    stackedChart: (raw.stackedChart || "").toLowerCase() === "true",
    raw,
  };
};

const DEFAULT_SETTINGS = { envelopeMode: false, stackedChart: false, raw: {} };

// Goals tab: Name | Target | Saved | Deadline | Icon. Deadline stays a display
// string ("Mar 2027"); Sheets may hand back a Date cell, so normalize those.
const parseGoals = (rows) => !Array.isArray(rows) ? [] : rows.slice(1).map(row => ({
  name:     row[0] || "",
  target:   parseFloat(row[1]) || 0,
  saved:    parseFloat(row[2]) || 0,
  deadline: row[3] instanceof Object || /^\d{4}-\d{2}-\d{2}T/.test(String(row[3]))
    ? normalizeDate(row[3])
    : String(row[3] ?? ""),
  icon:     row[4] || "🎯",
})).filter(g => g.name);

// Watchlists tab: Name | Type (category|vendor) | Match | MonthlyLimit
const parseWatchlists = (rows) => !Array.isArray(rows) ? [] : rows.slice(1).map(row => ({
  name:         row[0] || "",
  type:         String(row[1]).toLowerCase() === "vendor" ? "vendor" : "category",
  match:        row[2] || "",
  monthlyLimit: parseFloat(row[3]) || 0,
})).filter(w => w.name && w.match);

// Fixed tab: Name | Amount | Category | Subcategory | Day | Active
const parseFixed = (rows) => !Array.isArray(rows) ? [] : rows.slice(1).map(row => ({
  name:        row[0] || "",
  amount:      parseFloat(row[1]) || 0,
  category:    row[2] || "",
  subcategory: row[3] || "",
  day:         parseInt(row[4], 10) || 1,
  active:      String(row[5]).toLowerCase() === "true",
})).filter(f => f.name);

// Investments tab: Ticker | Name | Units | Price | Value | Notes.
// Price/Value cells may hold GOOGLEFINANCE formulas — Sheets returns the
// computed numbers, so unlisted funds simply have a typed Value instead.
const parseInvestments = (rows) => !Array.isArray(rows) ? [] : rows.slice(1).map(row => {
  const units = parseFloat(row[2]) || 0;
  const price = parseFloat(row[3]) || 0;
  const value = parseFloat(row[4]);
  return {
    ticker: row[0] ? String(row[0]) : "",
    name:   row[1] || String(row[0] || ""),
    units,
    price,
    value:  Number.isFinite(value) && value > 0 ? value : units * price,
    notes:  row[5] || "",
  };
}).filter(i => i.name && i.value > 0);

// NetWorthHistory tab: Date | Assets | Liabilities | Net
const parseNetWorth = (rows) => !Array.isArray(rows) ? [] : rows.slice(1).map(row => ({
  date:        normalizeDate(row[0]),
  assets:      parseFloat(row[1]) || 0,
  liabilities: parseFloat(row[2]) || 0,
  net:         parseFloat(row[3]) || 0,
})).filter(h => h.date).sort((a, b) => a.date.localeCompare(b.date));

export function useSheetData() {
  const [transactions, setTransactions] = useState([]);
  const [budgets,      setBudgets]      = useState({});
  const [assets,       setAssets]       = useState([]);
  const [settings,     setSettings]     = useState(DEFAULT_SETTINGS);
  const [goals,        setGoals]        = useState([]);
  const [watchlists,   setWatchlists]   = useState([]);
  const [fixed,        setFixed]        = useState([]);
  const [investments,  setInvestments]  = useState([]);
  const [netWorthHistory, setNetWorthHistory] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (useMock) {
        await new Promise(r => setTimeout(r, 600));
        setTransactions(MOCK_TRANSACTIONS);
        setBudgets(MOCK_BUDGETS);
        setAssets(MOCK_ASSETS);
        setSettings(DEFAULT_SETTINGS);
        setGoals(MOCK_GOALS);
        setWatchlists(MOCK_WATCHLISTS);
        setNetWorthHistory(MOCK_NETWORTH);
        setFixed(MOCK_FIXED);
        setInvestments(MOCK_INVESTMENTS);
      } else {
        const [txRows, budgetRows, assetRows, settingRows, goalRows, watchlistRows, netWorthRows, fixedRows, investmentRows] = await Promise.all([
          fetchSheet("transactions"),
          fetchSheet("budgets"),
          fetchSheet("assets"),
          fetchSheet("settings"),
          fetchSheet("goals"),
          fetchSheet("watchlists"),
          fetchSheet("networth"),
          fetchSheet("fixed"),
          fetchSheet("investments"),
        ]);
        setTransactions(parseTransactions(txRows));
        setBudgets(parseBudgets(budgetRows));
        setAssets(parseAssets(assetRows));
        setSettings(parseSettings(settingRows));
        setGoals(parseGoals(goalRows));
        setWatchlists(parseWatchlists(watchlistRows));
        setNetWorthHistory(parseNetWorth(netWorthRows));
        setFixed(parseFixed(fixedRows));
        setInvestments(parseInvestments(investmentRows));
      }
    } catch (e) {
      setError(e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  // Optimistic writes: update state immediately, roll back if the POST fails.
  const saveSetting = useCallback(async (key, value) => {
    if (useMock) throw new Error("Not available in mock mode");
    let previous;
    setSettings(s => {
      previous = s;
      const raw = { ...s.raw, [key]: String(value) };
      return {
        ...s,
        raw,
        envelopeMode: (raw.envelopeMode || "").toLowerCase() === "true",
        stackedChart: (raw.stackedChart || "").toLowerCase() === "true",
      };
    });
    try {
      await postAction({ action: "setSetting", key, value: String(value) });
    } catch (e) {
      setSettings(previous);
      throw e;
    }
  }, []);

  const saveBudgets = useCallback(async (next) => {
    if (useMock) throw new Error("Not available in mock mode");
    let previous;
    setBudgets(b => { previous = b; return next; });
    try {
      await postAction({ action: "setBudgets", budgets: next });
    } catch (e) {
      setBudgets(previous);
      throw e;
    }
  }, []);

  const saveGoals = useCallback(async (next) => {
    if (useMock) throw new Error("Not available in mock mode");
    let previous;
    setGoals(g => { previous = g; return next; });
    try {
      await postAction({ action: "setGoals", goals: next });
    } catch (e) {
      setGoals(previous);
      throw e;
    }
  }, []);

  const saveWatchlists = useCallback(async (next) => {
    if (useMock) throw new Error("Not available in mock mode");
    let previous;
    setWatchlists(w => { previous = w; return next; });
    try {
      await postAction({ action: "setWatchlists", watchlists: next });
    } catch (e) {
      setWatchlists(previous);
      throw e;
    }
  }, []);

  const saveFixed = useCallback(async (next) => {
    if (useMock) throw new Error("Not available in mock mode");
    let previous;
    setFixed(f => { previous = f; return next; });
    try {
      await postAction({ action: "setFixed", fixed: next });
    } catch (e) {
      setFixed(previous);
      throw e;
    }
  }, []);

  return {
    transactions, budgets, assets, settings, goals, watchlists, netWorthHistory, fixed, investments,
    loading, error, refetch: load,
    saveSetting, saveBudgets, saveGoals, saveWatchlists, saveFixed,
    isMock: useMock,
  };
}
