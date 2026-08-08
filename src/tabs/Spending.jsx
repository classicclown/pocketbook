import { useState, useMemo, useDeferredValue } from "react";
import {
  BarChart, Bar, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine,
} from "recharts";
import { useTheme } from "../theme/ThemeContext";
import { useIsMobile } from "../hooks/useMediaQuery";
import Card from "../components/Card";
import CustomTooltip from "../components/CustomTooltip";
import Chip from "../components/Chip";
import PageHeader from "../components/PageHeader";
import SectionHeader from "../components/SectionHeader";
import { useChartDefaults } from "../theme/chart";
import EnvelopeCard from "../components/EnvelopeCard";
import CategorizeSheet from "../components/CategorizeSheet";
import DetailSheet from "../components/DetailSheet";
import SplitSheet from "../components/SplitSheet";
import { CategoryDetail, MerchantDetail } from "../components/InsightDetails";
import { useTags } from "../hooks/useTags";
import { useSplits, splitId } from "../hooks/useSplits";
import { projectMonth, isSpend } from "../utils/projection";
import { detectRecurring } from "../utils/recurring";
import {
  getMonths, filterByMonth, totalExpenses, sumByCategory, sumByVendor,
  fmt, monthLabel, MONTH_LABELS,
} from "../utils/compute";

function TransactionRow({ tx, onInspectVendor, onCategorize, onSplit }) {
  const { T } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const { getTag, setTag, options: tagOptions } = useTags();
  const tag   = getTag(tx);
  const isIncome  = tx.category === "Income";
  const isUSD     = tx.currency === "USD";
  const isReimbursement = Boolean(tx._reimbursement);
  const isSplit   = Boolean(tx._split);
  // A real, splittable expense (not income, transfer, reimbursement or synthetic fixed).
  const splittable = onSplit && !isIncome && !isReimbursement && !tx.fixed
    && tx.category !== "Transfer" && (tx._split ? tx._split.original : tx.amount) > 0;

  return (
    <div>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 0",
          cursor: "pointer",
          borderBottom: `1px solid ${T.border}`,
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>
            {isIncome ? "💰" : isUSD ? "🌍" : "💳"}
          </span>
          <div style={{ minWidth: 0 }}>
            <div
              onClick={onInspectVendor ? (e) => { e.stopPropagation(); onInspectVendor(tx.vendor); } : undefined}
              title={onInspectVendor ? "Merchant insights" : undefined}
              style={{
                fontSize: 13, fontWeight: 600, color: T.text,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                textDecoration: onInspectVendor ? "underline dotted" : "none",
                textDecorationColor: T.border2, textUnderlineOffset: 3,
              }}
            >
              {tx.vendor}
            </div>
            <div style={{ fontSize: 11, color: T.sub }}>
              {tx.date} · {tx.category}
              {tx.fixed && (
                <span style={{
                  marginLeft: 6,
                  fontSize: 9, fontWeight: 600, textTransform: "uppercase",
                  background: T.dim, color: T.sub, border: `1px solid ${T.border2}`,
                  padding: "0px 5px", borderRadius: 2,
                }}>Fixed</span>
              )}
              {tag && (
                <span style={{
                  marginLeft: 6,
                  fontSize: 9, fontWeight: 600, textTransform: "uppercase",
                  background: T.accentBg, color: T.accent,
                  padding: "1px 5px", borderRadius: 2,
                }}>{tag}</span>
              )}
              {isSplit && (
                <span style={{
                  marginLeft: 6,
                  fontSize: 9, fontWeight: 600, textTransform: "uppercase",
                  background: T.accentBg, color: T.accent,
                  padding: "1px 5px", borderRadius: 2,
                }}>Split</span>
              )}
              {isReimbursement && (
                <span style={{
                  marginLeft: 6,
                  fontSize: 9, fontWeight: 600, textTransform: "uppercase",
                  background: T.dim, color: T.sub, border: `1px solid ${T.border2}`,
                  padding: "0px 5px", borderRadius: 2,
                }}>Reimbursement</span>
              )}
            </div>
          </div>
        </div>
        <div style={{ flexShrink: 0, textAlign: "right" }}>
          <div style={{
            fontSize: 14, fontWeight: 700, fontFamily: T.mono,
            color: isIncome ? T.green : isReimbursement ? T.sub : T.text,
          }}>
            {isIncome ? "+" : ""}{fmt(tx.originalAmount ?? tx.amount, tx.currency)}
          </div>
          {isSplit && (
            <div style={{ fontSize: 10, fontFamily: T.mono, color: T.sub, textDecoration: "line-through" }}>
              {fmt(tx._split.original)}
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ background: T.dim, padding: "12px 16px", marginBottom: 1 }}>
          <div style={{ display: "flex", gap: 24, marginBottom: 10, fontSize: 12, color: T.sub }}>
            {tx.subcategory && <span>Subcategory: <strong style={{ color: T.text }}>{tx.subcategory}</strong></span>}
            {tx.card && <span>Card: <strong style={{ color: T.text }}>{tx.card}</strong></span>}
          </div>
          {(tx._split || tx._reimbursement) && (
            <div style={{ fontSize: 11, color: T.sub, marginBottom: 10 }}>
              {tx._split
                ? `Your share of ${fmt(tx._split.original)} — counts as ${fmt(tx._split.effective)} spend`
                : `Reimbursement of ${fmt(tx._reimbursement.amount)} — netted against a linked expense`}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {onCategorize && (!tx.category || tx.category === "Uncategorised") && (
              <button
                onClick={(e) => { e.stopPropagation(); onCategorize(tx); }}
                style={{
                  fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: T.radiusSm,
                  border: `1px dashed ${T.accent}`, background: "transparent",
                  color: T.accent, cursor: "pointer", fontFamily: T.font,
                }}
              >
                Categorise this vendor…
              </button>
            )}
            {splittable && (
              <button
                onClick={(e) => { e.stopPropagation(); onSplit(tx); }}
                style={{
                  fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: T.radiusSm,
                  border: `1px dashed ${T.accent}`, background: "transparent",
                  color: T.accent, cursor: "pointer", fontFamily: T.font,
                }}
              >
                {tx._split ? "Edit split…" : "Split / reimbursed…"}
              </button>
            )}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.sub, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Tag</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {tagOptions.map(t2 => {
              const active = tag === t2;
              return (
                <button
                  key={t2}
                  onClick={(e) => {
                    e.stopPropagation();
                    setTag(tx, active ? null : t2);
                  }}
                  style={{
                    fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: T.radiusSm,
                    border: `1px solid ${active ? T.accent : T.border}`,
                    background: active ? T.accentBg : "transparent",
                    color: active ? T.accent : T.sub,
                    cursor: "pointer", fontFamily: T.font,
                  }}
                >
                  {t2}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Collapsible header used for both the Category (depth 0) and Sub-category
// (depth 1) levels of the transactions accordion.
function GroupHeader({ label, total, count, depth, open, onClick, onLabelClick }) {
  const { T } = useTheme();
  const isTop = depth === 0;
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: isTop ? "12px 0" : "9px 0",
        cursor: "pointer", gap: 12,
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <span style={{
          fontSize: 9, color: T.sub, width: 9, flexShrink: 0,
          transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s",
        }}>▶</span>
        <span
          onClick={onLabelClick ? (e) => { e.stopPropagation(); onLabelClick(); } : undefined}
          title={onLabelClick ? "Category insights" : undefined}
          style={{
            fontSize: isTop ? 13 : 12,
            fontWeight: isTop ? 700 : 600,
            color: isTop ? T.text : T.sub,
            textTransform: isTop ? "uppercase" : "none",
            letterSpacing: isTop ? 0.5 : 0,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            textDecoration: onLabelClick ? "underline dotted" : "none",
            textDecorationColor: T.border2, textUnderlineOffset: 3,
          }}
        >{label}</span>
        <span style={{ fontSize: 10, color: T.sub, flexShrink: 0 }}>· {count}</span>
      </div>
      <span style={{ fontSize: isTop ? 13 : 12, fontWeight: 600, fontFamily: T.mono, color: T.text, flexShrink: 0 }}>
        {fmt(total)}
      </span>
    </div>
  );
}

// Level 2: a sub-category. Expands to reveal the individual vendor transactions.
function SubGroup({ sub, onInspectVendor, onCategorize, onSplit }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <GroupHeader label={sub.name} total={sub.total} count={sub.count} depth={1} open={open} onClick={() => setOpen(o => !o)} />
      {open && (
        <div style={{ paddingLeft: 16 }}>
          {sub.items.map((tx, i) => (
            <TransactionRow key={i} tx={tx} onInspectVendor={onInspectVendor} onCategorize={onCategorize} onSplit={onSplit} />
          ))}
        </div>
      )}
    </div>
  );
}

// Level 1: a category. Expands to reveal its sub-categories; the label itself
// opens the category insight panel.
function CategoryGroup({ cat, onInspect, onInspectVendor, onCategorize, onSplit }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <GroupHeader
        label={cat.name} total={cat.total} count={cat.count} depth={0}
        open={open} onClick={() => setOpen(o => !o)}
        onLabelClick={onInspect}
      />
      {open && (
        <div style={{ paddingLeft: 16 }}>
          {cat.subs.map(sub => (
            <SubGroup key={sub.name} sub={sub} onInspectVendor={onInspectVendor} onCategorize={onCategorize} onSplit={onSplit} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Spending({ transactions, budgets, settings, watchlists = [], fixed = [], refetch, isMock }) {
  const { T } = useTheme();
  const isMobile = useIsMobile();
  const chart = useChartDefaults();
  const [view,         setView]         = useState("chart");    // "chart" | "table"
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [breakdown,    setBreakdown]    = useState("category"); // "category" | "vendor"
  const [detail,       setDetail]       = useState(null);       // { type: "category"|"vendor", name }
  const [categorize,   setCategorize]   = useState(null);       // false-y | { initialTx? }
  const [splitTx,      setSplitTx]      = useState(null);       // false-y | expense tx being split
  const [listMode,     setListMode]     = useState("categories"); // "categories" | "all" | "recurring" | <category>
  const { splits, setSplit, removeSplit } = useSplits();


  const months = useMemo(() => getMonths(transactions), [transactions]);

  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Search & filters
  const [query,          setQuery]          = useState("");
  const [filterCurrency, setFilterCurrency] = useState(null);
  const [filterCard,     setFilterCard]     = useState(null);
  const deferredQuery = useDeferredValue(query);

  // Current-month projection (daily run rate, one-offs not extrapolated)
  const { getTag } = useTags();
  const [curYear, curMonth] = currentYM.split("-").map(Number);
  const proj = useMemo(
    () => projectMonth(transactions, { year: curYear, month: curMonth, getTag, fixed }),
    [transactions, curYear, curMonth, getTag, fixed]
  );
  const totalBudget = Object.values(budgets).reduce((s, v) => s + v, 0);

  // Monthly chart data
  const monthlyData = useMemo(() => months.slice().reverse().map(ym => {
    const [y, m] = ym.split("-").map(Number);
    const tx = filterByMonth(transactions, y, m);
    return { ym, label: MONTH_LABELS[m - 1], total: totalExpenses(tx) };
  }), [months, transactions]);

  // Drill-down data
  const drillTx = useMemo(() => {
    if (!selectedMonth) return [];
    const [y, m] = selectedMonth.split("-").map(Number);
    return filterByMonth(transactions, y, m);
  }, [selectedMonth, transactions]);

  const drillData = useMemo(() => {
    if (!selectedMonth) return [];
    const fn = breakdown === "category" ? sumByCategory : sumByVendor;
    const sums = fn(drillTx.filter(t => t.category !== "Income" && t.category !== "Transfer"));
    return Object.entries(sums)
      .sort((a, b) => b[1] - a[1])
      .map(([name, total]) => ({ name, total }));
  }, [drillTx, breakdown, selectedMonth]);

  // The transaction list is scoped to one month — the current month by
  // default, or whichever month is selected on the chart.
  const listYM = selectedMonth || currentYM;
  const monthTx = useMemo(() => {
    const [y, m] = listYM.split("-").map(Number);
    return filterByMonth(transactions, y, m).slice().sort((a, b) => b.date.localeCompare(a.date));
  }, [listYM, transactions]);

  // Currency / card filters narrow the whole list (accordion and flat views).
  const scopedTx = useMemo(() => monthTx.filter(t => {
    if (filterCurrency && t.currency !== filterCurrency) return false;
    if (filterCard && t.card !== filterCard) return false;
    return true;
  }), [monthTx, filterCurrency, filterCard]);

  // Vendors that look like recurring subscriptions/bills, for the quick filter.
  const recurringVendors = useMemo(
    () => new Set(detectRecurring(transactions).map(r => r.vendor)),
    [transactions]
  );

  // Top spending categories in the current scope, offered as quick-filter chips.
  const topCategories = useMemo(() => {
    const totals = {};
    scopedTx.forEach(t => { if (isSpend(t)) totals[t.category] = (totals[t.category] || 0) + t.amount; });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c]) => c);
  }, [scopedTx]);

  // Flat chronological list for the non-"categories" view modes.
  const listTx = useMemo(() => {
    if (listMode === "categories") return [];
    if (listMode === "all") return scopedTx;
    if (listMode === "recurring") return scopedTx.filter(t => t.fixed || recurringVendors.has(t.vendor));
    return scopedTx.filter(t => t.category === listMode);
  }, [listMode, scopedTx, recurringVendors]);

  // Nested Category → Sub-category → vendor transactions, each level totalled
  // and sorted by spend (highest first).
  const categoryTree = useMemo(() => {
    const cats = {};
    scopedTx.forEach(t => {
      const catName = t.category || "Uncategorised";
      const subName = (t.subcategory && String(t.subcategory)) || "Other";
      if (!cats[catName]) cats[catName] = { name: catName, total: 0, count: 0, subs: {} };
      cats[catName].total += t.amount;
      cats[catName].count += 1;
      const subs = cats[catName].subs;
      if (!subs[subName]) subs[subName] = { name: subName, total: 0, count: 0, items: [] };
      subs[subName].total += t.amount;
      subs[subName].count += 1;
      subs[subName].items.push(t);
    });
    return Object.values(cats)
      .map(c => ({
        ...c,
        subs: Object.values(c.subs)
          .map(s => ({ ...s, items: s.items.slice().sort((a, b) => b.date.localeCompare(a.date)) }))
          .sort((a, b) => b.total - a.total),
      }))
      .sort((a, b) => b.total - a.total);
  }, [scopedTx]);

  const currencies = useMemo(
    () => Array.from(new Set(transactions.map(t => t.currency))).sort(),
    [transactions]
  );

  const cards = useMemo(
    () => Array.from(new Set(transactions.map(t => t.card).filter(Boolean))).sort(),
    [transactions]
  );

  // Teach loop: uncategorised transactions + known categories for the picker
  const uncategorised = useMemo(
    () => transactions
      .filter(t => !t.category || t.category === "Uncategorised")
      .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions]
  );

  const knownCategories = useMemo(() => {
    const seen = new Set(Object.keys(budgets));
    transactions.forEach(t => {
      if (t.category && t.category !== "Uncategorised" && t.category !== "Income" && t.category !== "Transfer") {
        seen.add(t.category);
      }
    });
    return Array.from(seen).sort();
  }, [budgets, transactions]);

  const subcategoriesByCategory = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      if (t.category && t.subcategory && t.category !== "Uncategorised") {
        (map[t.category] ??= new Set()).add(t.subcategory);
      }
    });
    return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, Array.from(v).sort()]));
  }, [transactions]);

  // Typing in the search box searches across ALL months (currency/card still
  // narrow it); the view-mode chips only apply to the month-scoped list.
  const searchActive = Boolean(deferredQuery.trim());

  const searchResults = useMemo(() => {
    if (!searchActive) return null;
    const q = deferredQuery.trim().toLowerCase();
    return transactions
      .filter(t => {
        if (!`${t.vendor} ${t.category} ${t.subcategory}`.toLowerCase().includes(q)) return false;
        if (filterCurrency && t.currency !== filterCurrency) return false;
        if (filterCard && t.card !== filterCard) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [searchActive, deferredQuery, filterCurrency, filterCard, transactions]);

  const searchTotal = useMemo(
    () => (searchResults || []).filter(isSpend).reduce((s, t) => s + t.amount, 0),
    [searchResults]
  );

  const clearSearch = () => {
    setQuery("");
    setFilterCurrency(null);
    setFilterCard(null);
  };

  // Envelope view: allocated vs spent per category for the viewed month
  const envelopeMode = settings?.envelopeMode;
  const envelopeYM = selectedMonth || currentYM;
  const envelopes = useMemo(() => {
    if (!envelopeMode) return null;
    const [y, m] = envelopeYM.split("-").map(Number);
    const monthTx = filterByMonth(transactions, y, m)
      .filter(t => t.category !== "Income" && t.category !== "Transfer");
    const spend = sumByCategory(monthTx);
    const isCurrent = envelopeYM === currentYM;

    const cards = Object.entries(budgets).map(([name, allocated]) => ({
      name,
      allocated,
      spent: spend[name] || 0,
      projected: isCurrent ? proj.byCategory[name]?.projected : undefined,
    })).sort((a, b) => (b.spent / b.allocated) - (a.spent / a.allocated));

    const unallocated = Object.entries(spend)
      .filter(([name]) => !budgets[name])
      .reduce((s, [, v]) => s + v, 0);

    return { cards, unallocated };
  }, [envelopeMode, envelopeYM, currentYM, transactions, budgets, proj]);

  // Stacked monthly chart: per-month totals for the top 6 categories + Other
  const stackedInfo = useMemo(() => {
    if (!settings?.stackedChart) return null;
    const catTotals = {};
    transactions.forEach(t => {
      if (isSpend(t)) catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
    });
    const top = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([c]) => c);
    const topSet = new Set(top);
    const data = months.slice().reverse().map(ym => {
      const [y, m] = ym.split("-").map(Number);
      const row = { ym, label: MONTH_LABELS[m - 1] };
      let other = 0;
      filterByMonth(transactions, y, m).forEach(t => {
        if (!isSpend(t)) return;
        if (topSet.has(t.category)) row[t.category] = (row[t.category] || 0) + t.amount;
        else other += t.amount;
      });
      if (other > 0) row.Other = other;
      return row;
    });
    return { keys: [...top, "Other"], data };
  }, [settings?.stackedChart, months, transactions]);

  // Watchlists: month-to-date spend for watched vendors/categories
  const watchCards = useMemo(() => {
    if (!watchlists.length) return [];
    const ym = selectedMonth || currentYM;
    const [y, m] = ym.split("-").map(Number);
    const monthTx = filterByMonth(transactions, y, m).filter(isSpend);
    const isCurrent = ym === currentYM;
    const runRate = isCurrent && proj.elapsedDays > 0 ? proj.daysInMonth / proj.elapsedDays : 1;
    return watchlists.map(w => {
      const spent = monthTx
        .filter(t => (w.type === "vendor" ? t.vendor === w.match : t.category === w.match))
        .reduce((s, t) => s + t.amount, 0);
      return {
        name: w.name,
        allocated: w.monthlyLimit,
        spent,
        projected: isCurrent ? spent * runRate : undefined,
      };
    });
  }, [watchlists, selectedMonth, currentYM, transactions, proj]);

  const barColor = (ym) => {
    if (ym === selectedMonth) return T.accent;
    if (ym === currentYM && !selectedMonth) return T.yellow;
    return T.chartMuted;
  };

  return (
    <div>
      <PageHeader title="Spending" />

      {/* Top controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <Chip label="Chart" active={view === "chart"} onClick={() => setView("chart")} />
        <Chip label="Table" active={view === "table"} onClick={() => setView("table")} />
        {selectedMonth && (
          <>
            <span style={{ fontSize: 12, color: T.sub, marginLeft: 4 }}>{monthLabel(selectedMonth)}</span>
            <button
              onClick={() => setSelectedMonth(null)}
              style={{
                marginLeft: "auto", fontSize: 12, color: T.sub, background: "none",
                border: `1px solid ${T.border}`, borderRadius: T.radius, padding: "4px 10px",
                cursor: "pointer", fontFamily: T.font,
              }}
            >
              ✕ Clear
            </button>
          </>
        )}
      </div>

      {/* Breakdown chips (only when drilled) */}
      {selectedMonth && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <Chip label="Category" active={breakdown === "category"} onClick={() => setBreakdown("category")} />
          <Chip label="Vendor"   active={breakdown === "vendor"}   onClick={() => setBreakdown("vendor")} />
        </div>
      )}

      {/* Uncategorised review banner */}
      {uncategorised.length > 0 && (
        <button
          onClick={() => setCategorize({})}
          style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            background: T.accentBg, border: `1px dashed ${T.accent}`,
            borderRadius: T.radius, padding: "10px 14px", marginBottom: 12,
            cursor: "pointer", fontFamily: T.font, textAlign: "left",
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: T.accent }}>
            {uncategorised.length} uncategorised transaction{uncategorised.length === 1 ? "" : "s"}
          </span>
          <span style={{ fontSize: 11, color: T.sub }}>— tap to review and teach the category engine</span>
        </button>
      )}

      {/* Current-month projection summary */}
      {(!selectedMonth || selectedMonth === currentYM) && proj.spent > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
          fontSize: 12, color: T.sub, marginBottom: 12,
        }}>
          <span>
            Projected this month:{" "}
            <strong style={{ fontFamily: T.mono, color: totalBudget > 0 && proj.projected > totalBudget ? T.red : T.text }}>
              {fmt(proj.projected)}
            </strong>
            {totalBudget > 0 && <span> of {fmt(totalBudget)} budget</span>}
          </span>
          <span>· {proj.daysInMonth - proj.elapsedDays} days left</span>
          {proj.lowConfidence && <span style={{ color: T.yellow }}>· low confidence</span>}
        </div>
      )}

      {/* Chart or Table */}
      {view === "chart" ? (
        <Card>
          {!selectedMonth && stackedInfo ? (
            <ResponsiveContainer width="100%" height={isMobile ? 180 : 300}>
              <BarChart data={stackedInfo.data} barSize={28} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" tick={chart.tick} axisLine={chart.axisLine} tickLine={chart.tickLine} />
                <YAxis tickFormatter={chart.kFormat} tick={chart.tick} axisLine={chart.axisLine} tickLine={chart.tickLine} />
                <Tooltip content={<CustomTooltip />} />
                {proj.spent > 0 && (
                  <ReferenceLine y={proj.projected} stroke={T.yellow} strokeDasharray="4 2" />
                )}
                {stackedInfo.keys.map((k, i) => (
                  <Bar
                    key={k}
                    dataKey={k}
                    name={k}
                    stackId="month"
                    fill={k === "Other" ? T.chartMuted : chart.series[i % chart.series.length]}
                    onClick={(d) => {
                      const ym = d?.ym ?? d?.payload?.ym;
                      if (ym) setSelectedMonth(ym);
                    }}
                    style={{ cursor: "pointer" }}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
          <ResponsiveContainer width="100%" height={isMobile ? 180 : 300}>
            <BarChart
              data={selectedMonth ? drillData : monthlyData}
              barSize={28}
              margin={{ top: 4, right: 0, left: -20, bottom: 0 }}
            >
              <XAxis
                dataKey={selectedMonth ? "name" : "label"}
                tick={chart.tick}
                axisLine={chart.axisLine} tickLine={chart.tickLine}
              />
              <YAxis
                tickFormatter={chart.kFormat}
                tick={chart.tick}
                axisLine={chart.axisLine} tickLine={chart.tickLine}
              />
              <Tooltip content={<CustomTooltip />} />
              {/* Budget reference lines in category mode */}
              {selectedMonth && breakdown === "category" && Object.entries(budgets).map(([cat, limit]) => (
                <ReferenceLine key={cat} y={limit} stroke={T.border2} strokeDasharray="4 2" />
              ))}
              {/* Projected month-end total on the monthly view */}
              {!selectedMonth && proj.spent > 0 && (
                <ReferenceLine y={proj.projected} stroke={T.yellow} strokeDasharray="4 2" />
              )}
              <Bar
                dataKey="total"
                radius={[2, 2, 0, 0]}
                onClick={(data) => {
                  if (!selectedMonth && data.ym) setSelectedMonth(data.ym);
                }}
                style={{ cursor: !selectedMonth ? "pointer" : "default" }}
              >
                {(selectedMonth ? drillData : monthlyData).map((entry, i) => {
                  const isOver = selectedMonth && breakdown === "category" && budgets[entry.name] && entry.total > budgets[entry.name];
                  const fill   = selectedMonth ? (isOver ? T.red : T.accent) : barColor(entry.ym);
                  return <Cell key={i} fill={fill} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          )}
        </Card>
      ) : (
        <Card style={{ padding: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: T.font }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                <th style={{ padding: "10px 16px", fontSize: 11, color: T.sub, textAlign: "left", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Month</th>
                <th style={{ padding: "10px 16px", fontSize: 11, color: T.sub, textAlign: "right", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Total Spent</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.slice().reverse().map(row => (
                <tr
                  key={row.ym}
                  onClick={() => setSelectedMonth(row.ym === selectedMonth ? null : row.ym)}
                  style={{
                    cursor: "pointer",
                    background: row.ym === selectedMonth ? T.accentBg : "transparent",
                    borderBottom: `1px solid ${T.border}`,
                  }}
                >
                  <td style={{ padding: "10px 16px", fontSize: 13, color: T.text }}>{monthLabel(row.ym)}</td>
                  <td style={{ padding: "10px 16px", fontSize: 13, fontFamily: T.mono, color: T.text, textAlign: "right" }}>{fmt(row.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Desktop: transactions 60% left, envelopes/watchlists/budget 40% right */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 3fr) minmax(0, 2fr)",
        gap: isMobile ? 0 : 16,
        alignItems: "start",
      }}>
      <div style={{ order: isMobile ? 0 : 2 }}>
      {/* Envelopes (envelope mode replaces the budget summary) */}
      {envelopes && envelopes.cards.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <SectionHeader right={monthLabel(envelopeYM)}>Envelopes</SectionHeader>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 10,
          }}>
            {envelopes.cards.map(env => (
              <EnvelopeCard
                key={env.name}
                name={env.name}
                allocated={env.allocated}
                spent={env.spent}
                projected={env.projected}
              />
            ))}
            {envelopes.unallocated > 0 && (
              <EnvelopeCard name="Unallocated" allocated={0} spent={envelopes.unallocated} muted />
            )}
          </div>
        </div>
      )}

      {/* Watchlists */}
      {watchCards.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <SectionHeader right={monthLabel(selectedMonth || currentYM)}>Watchlists</SectionHeader>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 10,
          }}>
            {watchCards.map(w => (
              <EnvelopeCard
                key={w.name}
                name={w.name}
                allocated={w.allocated}
                spent={w.spent}
                projected={w.projected}
              />
            ))}
          </div>
        </div>
      )}

      {/* Budget summary card (category drill-down only, non-envelope mode) */}
      {!envelopeMode && selectedMonth && breakdown === "category" && (
        <Card>
          <SectionHeader>Budget Summary · {monthLabel(selectedMonth)}</SectionHeader>
          {drillData.map(({ name, total }) => {
            const limit = budgets[name];
            if (!limit) return null;
            const over = total > limit;
            return (
              <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: T.text }}>{name}</span>
                <span style={{ fontFamily: T.mono, color: over ? T.red : T.text }}>
                  {fmt(total)} <span style={{ color: T.sub }}>/ {fmt(limit)}</span>
                  {over && <span style={{ marginLeft: 6, fontSize: 10, color: T.red, fontWeight: 700 }}>OVER</span>}
                </span>
              </div>
            );
          })}
        </Card>
      )}
      </div>

      {/* Transaction list */}
      <div style={{ order: isMobile ? 0 : 1 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
            {searchActive
              ? <>Search results
                  <span style={{ marginLeft: 6, fontSize: 11, color: T.sub, fontWeight: 400 }}>
                    {searchResults.length} items · {fmt(searchTotal)} spend
                  </span>
                </>
              : <>Transactions · {monthLabel(listYM)}
                  <span style={{ marginLeft: 6, fontSize: 11, color: T.sub, fontWeight: 400 }}>
                    {(listMode === "categories" ? scopedTx.length : listTx.length)} items
                  </span>
                </>}
          </div>
          {(searchActive || filterCurrency || filterCard) && (
            <button
              onClick={clearSearch}
              style={{
                fontSize: 12, color: T.sub, background: "none",
                border: `1px solid ${T.border}`, borderRadius: T.radius, padding: "4px 10px",
                cursor: "pointer", fontFamily: T.font, flexShrink: 0,
              }}
            >
              ✕ Clear
            </button>
          )}
        </div>

        {/* Search input + filters (searches all months) */}
        <div style={{ marginBottom: 12 }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search vendor, category, sub-category…"
            style={{
              width: "100%", boxSizing: "border-box",
              fontSize: 13, fontFamily: T.font, color: T.text,
              background: T.bg, border: `1px solid ${T.border}`,
              borderRadius: T.radius, padding: "9px 12px",
              outline: "none",
            }}
          />
          {/* View-mode chips: how to present the month's transactions */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            <Chip label="Categories" active={listMode === "categories"} onClick={() => setListMode("categories")} />
            <Chip label="All" active={listMode === "all"} onClick={() => setListMode("all")} />
            <Chip label="Recurring" active={listMode === "recurring"} onClick={() => setListMode("recurring")} />
            {(["categories", "all", "recurring"].includes(listMode) || topCategories.includes(listMode)
              ? topCategories
              : [listMode, ...topCategories]
            ).map(c => (
              <Chip key={c} label={c} active={listMode === c} onClick={() => setListMode(c)} />
            ))}
          </div>
          {/* Cross-cutting filters */}
          {(currencies.length > 1 || cards.length > 1) && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
              {currencies.length > 1 && currencies.map(c => (
                <Chip key={c} label={c} active={filterCurrency === c}
                  onClick={() => setFilterCurrency(filterCurrency === c ? null : c)} />
              ))}
              {cards.length > 1 && cards.map(c => (
                <Chip key={c} label={`Card ${c}`} active={filterCard === c}
                  onClick={() => setFilterCard(filterCard === c ? null : c)} />
              ))}
            </div>
          )}
        </div>

        {searchActive ? (
          searchResults.length === 0 ? (
            <div style={{ padding: "16px 0", fontSize: 13, color: T.sub, textAlign: "center" }}>
              No matching transactions.
            </div>
          ) : (
            searchResults.slice(0, 200).map((tx, i) => (
              <TransactionRow
                key={`${tx.date}-${tx.vendor}-${i}`}
                tx={tx}
                onInspectVendor={(vendor) => setDetail({ type: "vendor", name: vendor })}
                onSplit={setSplitTx}
              />
            ))
          )
        ) : listMode === "categories" ? (
          categoryTree.length === 0 ? (
            <div style={{ padding: "16px 0", fontSize: 13, color: T.sub, textAlign: "center" }}>
              No transactions to show.
            </div>
          ) : (
            /* Nested accordion: tap a category to reveal its sub-categories,
               then a sub-category to reveal the individual vendor transactions. */
            categoryTree.map(cat => (
              <CategoryGroup
                key={cat.name}
                cat={cat}
                onInspect={() => setDetail({ type: "category", name: cat.name })}
                onInspectVendor={(vendor) => setDetail({ type: "vendor", name: vendor })}
                onCategorize={(tx) => setCategorize({ initialTx: tx })}
                onSplit={setSplitTx}
              />
            ))
          )
        ) : listTx.length === 0 ? (
          <div style={{ padding: "16px 0", fontSize: 13, color: T.sub, textAlign: "center" }}>
            No transactions to show.
          </div>
        ) : (
          /* Flat chronological list for All / Recurring / a single category */
          listTx.map((tx, i) => (
            <TransactionRow
              key={`${tx.date}-${tx.vendor}-${i}`}
              tx={tx}
              onInspectVendor={(vendor) => setDetail({ type: "vendor", name: vendor })}
              onCategorize={(t) => setCategorize({ initialTx: t })}
              onSplit={setSplitTx}
            />
          ))
        )}
        {searchActive && searchResults.length > 200 && (
          <div style={{ padding: "10px 0 0", fontSize: 11, color: T.sub, textAlign: "center" }}>
            Showing first 200 of {searchResults.length} results — refine your search.
          </div>
        )}
      </Card>
      </div>
      </div>

      {/* Uncategorised teach loop */}
      {categorize && (
        <CategorizeSheet
          transactions={uncategorised}
          categories={knownCategories}
          subcategoriesByCategory={subcategoriesByCategory}
          initialTx={categorize.initialTx}
          isMock={isMock}
          onSaved={() => { setCategorize(null); refetch(); }}
          onClose={() => setCategorize(null)}
        />
      )}

      {/* Shared-purchase / reimbursement split */}
      {splitTx && (
        <SplitSheet
          tx={splitTx}
          transactions={transactions}
          def={splits[splitId(splitTx)]}
          onSave={(d) => { setSplit(splitId(splitTx), d); setSplitTx(null); }}
          onRemove={() => { removeSplit(splitId(splitTx)); setSplitTx(null); }}
          onClose={() => setSplitTx(null)}
        />
      )}

      {/* Insight drill-down */}
      {detail && (
        <DetailSheet
          title={detail.name}
          subtitle={detail.type === "category" ? "Category insights" : "Merchant insights"}
          onClose={() => setDetail(null)}
        >
          {detail.type === "category" ? (
            <CategoryDetail
              transactions={transactions}
              category={detail.name}
              ym={selectedMonth || currentYM}
              projected={(selectedMonth || currentYM) === currentYM ? proj.byCategory[detail.name]?.projected : null}
            />
          ) : (
            <MerchantDetail
              transactions={transactions}
              vendor={detail.name}
              ym={selectedMonth || currentYM}
            />
          )}
        </DetailSheet>
      )}
    </div>
  );
}
