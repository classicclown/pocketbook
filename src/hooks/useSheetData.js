import { useState, useEffect, useCallback } from "react";
import {
  MOCK_TRANSACTIONS, MOCK_BUDGETS, MOCK_ASSETS,
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
    raw,
  };
};

const DEFAULT_SETTINGS = { envelopeMode: false, raw: {} };

export function useSheetData() {
  const [transactions, setTransactions] = useState([]);
  const [budgets,      setBudgets]      = useState({});
  const [assets,       setAssets]       = useState([]);
  const [settings,     setSettings]     = useState(DEFAULT_SETTINGS);
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
      } else {
        const [txRows, budgetRows, assetRows, settingRows] = await Promise.all([
          fetchSheet("transactions"),
          fetchSheet("budgets"),
          fetchSheet("assets"),
          fetchSheet("settings"),
        ]);
        setTransactions(parseTransactions(txRows));
        setBudgets(parseBudgets(budgetRows));
        setAssets(parseAssets(assetRows));
        setSettings(parseSettings(settingRows));
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

  return {
    transactions, budgets, assets, settings,
    loading, error, refetch: load,
    saveSetting, saveBudgets,
    isMock: useMock,
  };
}
