import { useState, useEffect, useCallback } from "react";
import {
  MOCK_TRANSACTIONS, MOCK_BUDGETS, MOCK_ASSETS,
} from "../utils/compute";

const SCRIPT_URL = import.meta.env.DEV
  ? "/google-script"
  : import.meta.env.VITE_SCRIPT_URL;

const parseTransactions = (rows) => rows.slice(1).map(row => ({
  date:        row[0] || "",
  vendor:      row[1] || "",
  amount:      parseFloat(row[2]) || 0,
  currency:    row[3] || "ZAR",
  card:        row[4] || "",
  category:    row[5] || "Uncategorised",
  subcategory: row[6] || "",
})).filter(t => t.date);

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
