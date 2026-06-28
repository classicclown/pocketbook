import { useState, useEffect, useCallback } from "react";
import {
  MOCK_TRANSACTIONS, MOCK_BUDGETS, MOCK_ASSETS,
} from "../utils/compute";

const SCRIPT_URL = import.meta.env.DEV
  ? "/google-script"
  : import.meta.env.VITE_SCRIPT_URL;

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

// Sheet columns: Date | Description | Amount | Currency | Amount ZAR |
// Main Category | Sub Category | Merchant Key
// `amount` is always the ZAR-equivalent (Amount ZAR column, falling back to the
// original amount when blank) so all math is in one currency. The original
// amount + currency are kept for display only. Income is distinguished by category.
const parseTransactions = (rows) => rows.slice(1).map(row => {
  const original = parseFloat(row[2]) || 0;
  const zar      = parseFloat(row[4]);
  return {
    date:           normalizeDate(row[0]),
    vendor:         row[1] || "",
    amount:         Number.isFinite(zar) ? zar : original,
    originalAmount: original,
    currency:       row[3] || "ZAR",
    card:           "",
    category:       row[5] || "Uncategorised",
    subcategory:    row[6] || "",
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

const useMock = !SCRIPT_URL;

export function useSheetData() {
  const [transactions, setTransactions] = useState([]);
  const [budgets,      setBudgets]      = useState({});
  const [assets,       setAssets]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  const fetchSheet = useCallback(async (sheetName) => {
    const url = `${SCRIPT_URL}?sheet=${sheetName}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${sheetName}: ${res.status}`);
    return res.json();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (useMock) {
        await new Promise(r => setTimeout(r, 600));
        setTransactions(MOCK_TRANSACTIONS);
        setBudgets(MOCK_BUDGETS);
        setAssets(MOCK_ASSETS);
      } else {
        const [txRows, budgetRows, assetRows] = await Promise.all([
          fetchSheet("transactions"),
          fetchSheet("budgets"),
          fetchSheet("assets"),
        ]);
        setTransactions(parseTransactions(txRows));
        setBudgets(parseBudgets(budgetRows));
        setAssets(parseAssets(assetRows));
      }
    } catch (e) {
      setError(e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [fetchSheet]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  return { transactions, budgets, assets, loading, error, refetch: load };
}
