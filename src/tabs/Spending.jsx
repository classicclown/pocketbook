import { useState, useMemo } from "react";
import {
  BarChart, Bar, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine,
} from "recharts";
import { T } from "../tokens";
import Card from "../components/Card";
import CustomTooltip from "../components/CustomTooltip";
import {
  getMonths, filterByMonth, totalExpenses, sumByCategory, sumByVendor,
  fmt, monthLabel, MONTH_LABELS,
} from "../utils/compute";

const TAG_OPTIONS = ["Business", "Holiday", "One-off", "Irregular"];

function txKey(t) {
  return `tag_${t.date}_${t.vendor}_${t.amount}`;
}

function TransactionRow({ tx }) {
  const [expanded, setExpanded] = useState(false);
  const key   = txKey(tx);
  const tag   = localStorage.getItem(key);
  const isIncome  = tx.category === "Income";
  const isUSD     = tx.currency === "USD";

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
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {tx.vendor}
            </div>
            <div style={{ fontSize: 11, color: T.sub }}>
              {tx.date} · {tx.category}
              {tag && (
                <span style={{
                  marginLeft: 6,
                  fontSize: 9, fontWeight: 600, textTransform: "uppercase",
                  background: T.accentBg, color: T.accent,
                  padding: "1px 5px", borderRadius: 2,
                }}>{tag}</span>
              )}
            </div>
          </div>
        </div>
        <div style={{
          fontSize: 14, fontWeight: 700, fontFamily: T.mono,
          color: isIncome ? T.green : T.text,
          flexShrink: 0,
        }}>
          {isIncome ? "+" : ""}{fmt(tx.originalAmount ?? tx.amount, tx.currency)}
        </div>
      </div>

      {expanded && (
        <div style={{ background: T.dim, padding: "12px 16px", marginBottom: 1 }}>
          <div style={{ display: "flex", gap: 24, marginBottom: 10, fontSize: 12, color: T.sub }}>
            {tx.subcategory && <span>Subcategory: <strong style={{ color: T.text }}>{tx.subcategory}</strong></span>}
            {tx.card && <span>Card: <strong style={{ color: T.text }}>{tx.card}</strong></span>}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.sub, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Tag</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {TAG_OPTIONS.map(t2 => {
              const active = tag === t2;
              return (
                <button
                  key={t2}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (active) localStorage.removeItem(key);
                    else localStorage.setItem(key, t2);
                    // Force re-render by toggling expanded
                    setExpanded(false); setTimeout(() => setExpanded(true), 10);
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
function GroupHeader({ label, total, count, depth, open, onClick }) {
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
        <span style={{
          fontSize: isTop ? 13 : 12,
          fontWeight: isTop ? 700 : 600,
          color: isTop ? T.text : T.sub,
          textTransform: isTop ? "uppercase" : "none",
          letterSpacing: isTop ? 0.5 : 0,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{label}</span>
        <span style={{ fontSize: 10, color: T.sub, flexShrink: 0 }}>· {count}</span>
      </div>
      <span style={{ fontSize: isTop ? 13 : 12, fontWeight: 600, fontFamily: T.mono, color: T.text, flexShrink: 0 }}>
        {fmt(total)}
      </span>
    </div>
  );
}

// Level 2: a sub-category. Expands to reveal the individual vendor transactions.
function SubGroup({ sub }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <GroupHeader label={sub.name} total={sub.total} count={sub.count} depth={1} open={open} onClick={() => setOpen(o => !o)} />
      {open && (
        <div style={{ paddingLeft: 16 }}>
          {sub.items.map((tx, i) => <TransactionRow key={i} tx={tx} />)}
        </div>
      )}
    </div>
  );
}

// Level 1: a category. Expands to reveal its sub-categories.
function CategoryGroup({ cat }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <GroupHeader label={cat.name} total={cat.total} count={cat.count} depth={0} open={open} onClick={() => setOpen(o => !o)} />
      {open && (
        <div style={{ paddingLeft: 16 }}>
          {cat.subs.map(sub => <SubGroup key={sub.name} sub={sub} />)}
        </div>
      )}
    </div>
  );
}

function Chip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 12, fontWeight: active ? 600 : 400,
        padding: "5px 12px", borderRadius: T.radius,
        border: `1px solid ${active ? T.accent : T.border}`,
        background: active ? T.accentBg : "transparent",
        color: active ? T.accent : T.sub,
        cursor: "pointer", fontFamily: T.font,
      }}
    >
      {label}
    </button>
  );
}

export default function Spending({ transactions, budgets }) {
  const [view,         setView]         = useState("chart");    // "chart" | "table"
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [breakdown,    setBreakdown]    = useState("category"); // "category" | "vendor"

  const months = useMemo(() => getMonths(transactions), [transactions]);

  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

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
    const sums = fn(drillTx.filter(t => t.category !== "Income"));
    return Object.entries(sums)
      .sort((a, b) => b[1] - a[1])
      .map(([name, total]) => ({ name, total }));
  }, [drillTx, breakdown, selectedMonth]);

  // Transaction grouping
  const visibleTx = useMemo(() => {
    const base = selectedMonth ? drillTx : transactions.slice().sort((a, b) => b.date.localeCompare(a.date));
    return base;
  }, [selectedMonth, drillTx, transactions]);

  // Nested Category → Sub-category → vendor transactions, each level totalled
  // and sorted by spend (highest first).
  const categoryTree = useMemo(() => {
    const cats = {};
    visibleTx.forEach(t => {
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
  }, [visibleTx]);

  const barColor = (ym) => {
    if (ym === selectedMonth) return T.accent;
    if (ym === currentYM && !selectedMonth) return T.yellow;
    return T.border2;
  };

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: T.text, marginBottom: 20 }}>Spending</div>

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

      {/* Chart or Table */}
      {view === "chart" ? (
        <Card>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={selectedMonth ? drillData : monthlyData}
              barSize={28}
              margin={{ top: 4, right: 0, left: -20, bottom: 0 }}
            >
              <XAxis
                dataKey={selectedMonth ? "name" : "label"}
                tick={{ fontSize: 10, fill: T.sub }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 10, fill: T.sub }}
                axisLine={false} tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              {/* Budget reference lines in category mode */}
              {selectedMonth && breakdown === "category" && Object.entries(budgets).map(([cat, limit]) => (
                <ReferenceLine key={cat} y={limit} stroke={T.border2} strokeDasharray="4 2" />
              ))}
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

      {/* Budget summary card (category drill-down only) */}
      {selectedMonth && breakdown === "category" && (
        <Card>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.sub, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>
            Budget Summary · {monthLabel(selectedMonth)}
          </div>
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

      {/* Transaction list */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
            Transactions{selectedMonth ? ` · ${monthLabel(selectedMonth)}` : ""}
            <span style={{ marginLeft: 6, fontSize: 11, color: T.sub, fontWeight: 400 }}>
              {visibleTx.length} items
            </span>
          </div>
        </div>

        {/* Nested accordion: tap a category to reveal its sub-categories,
            then a sub-category to reveal the individual vendor transactions. */}
        {categoryTree.length === 0 ? (
          <div style={{ padding: "16px 0", fontSize: 13, color: T.sub, textAlign: "center" }}>
            No transactions to show.
          </div>
        ) : (
          categoryTree.map(cat => <CategoryGroup key={cat.name} cat={cat} />)
        )}
      </Card>
    </div>
  );
}
