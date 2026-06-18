import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";
import { T } from "../tokens";
import Card from "../components/Card";
import CustomTooltip from "../components/CustomTooltip";
import {
  getMonths, filterByMonth, totalExpenses, sumByCategory,
  fmt, monthLabel, MONTH_LABELS,
} from "../utils/compute";

function Chip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      fontSize: 12, fontWeight: active ? 600 : 400,
      padding: "5px 12px", borderRadius: T.radius,
      border: `1px solid ${active ? T.accent : T.border}`,
      background: active ? T.accentBg : "transparent",
      color: active ? T.accent : T.sub,
      cursor: "pointer", fontFamily: T.font,
    }}>
      {label}
    </button>
  );
}

export default function Analysis({ transactions }) {
  const [metric, setMetric] = useState("spending");

  const months = useMemo(() => getMonths(transactions).slice().reverse(), [transactions]);

  const monthlyStats = useMemo(() => months.map(ym => {
    const [y, m] = ym.split("-").map(Number);
    const tx      = filterByMonth(transactions, y, m);
    const income  = tx.filter(t => t.category === "Income" && t.currency === "ZAR").reduce((s, t) => s + t.amount, 0);
    const expenses = totalExpenses(tx);
    const savings  = income - expenses;
    const rate     = income > 0 ? (savings / income) * 100 : 0;
    return { ym, label: MONTH_LABELS[m - 1], income, expenses, savings, rate };
  }), [months, transactions]);

  const chartData = useMemo(() => monthlyStats.map(s => ({
    label: s.label,
    value: metric === "spending" ? s.expenses : metric === "savings" ? s.savings : 0,
  })), [monthlyStats, metric]);

  // Current and prev month values
  const current = monthlyStats[monthlyStats.length - 1];
  const prev    = monthlyStats[monthlyStats.length - 2];
  const curVal  = current ? (metric === "spending" ? current.expenses : current.savings) : 0;
  const prevVal = prev    ? (metric === "spending" ? prev.expenses    : prev.savings)    : 0;
  const delta   = curVal - prevVal;
  const deltaDir = delta >= 0 ? "+" : "";
  const positive = metric === "savings" ? delta >= 0 : delta <= 0;

  // Category comparison
  const now = new Date();
  const nowYear  = now.getFullYear();
  const nowMonth = now.getMonth() + 1;
  const curYM    = `${nowYear}-${String(nowMonth).padStart(2, "0")}`;
  const prevMonth = nowMonth === 1 ? 12 : nowMonth - 1;
  const prevYear  = nowMonth === 1 ? nowYear - 1 : nowYear;
  const prevYM    = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;

  const curTx  = useMemo(() => filterByMonth(transactions, nowYear, nowMonth), [transactions, nowYear, nowMonth]);
  const prevTx = useMemo(() => filterByMonth(transactions, prevYear, prevMonth), [transactions, prevYear, prevMonth]);
  const curCats  = useMemo(() => sumByCategory(curTx.filter(t => t.category !== "Income")),  [curTx]);
  const prevCats = useMemo(() => sumByCategory(prevTx.filter(t => t.category !== "Income")), [prevTx]);

  const allCats = Array.from(new Set([...Object.keys(curCats), ...Object.keys(prevCats)])).sort();

  const DOT_COLORS = [T.accent, T.green, "#7C6FCD", T.yellow, "#4A90D9", "#E87040", "#2DA89B", "#C14065"];

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: T.text, marginBottom: 20 }}>Analysis</div>

      {/* Trend chart */}
      <Card>
        {/* Metric toggle */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <Chip label="Spending" active={metric === "spending"} onClick={() => setMetric("spending")} />
          <Chip label="Savings"  active={metric === "savings"}  onClick={() => setMetric("savings")} />
        </div>

        {/* Current value */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 36, fontWeight: 700, fontFamily: T.mono, color: T.text, lineHeight: 1 }}>
            {fmt(Math.abs(curVal))}
          </div>
          <div style={{ fontSize: 12, color: positive ? T.green : T.red, marginTop: 4 }}>
            {prevVal > 0 && `${deltaDir}${fmt(Math.abs(delta))} vs ${monthLabel(prevYM)}`}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={T.border} strokeDasharray="4 2" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: T.sub }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: T.sub }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone" dataKey="value"
              stroke={T.accent} strokeWidth={2.5}
              dot={{ fill: T.accent, r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Savings rate bars */}
      <Card>
        <div style={{ fontSize: 11, fontWeight: 600, color: T.sub, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 14 }}>
          Monthly Savings Rate
        </div>
        {monthlyStats.slice().reverse().map((s) => (
          <div key={s.ym} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 36, fontSize: 11, color: T.sub, flexShrink: 0 }}>{s.label}</div>
            <div style={{ flex: 1, background: T.dim, height: 6 }}>
              <div style={{
                width: `${Math.max(0, Math.min(100, s.rate))}%`,
                height: 6,
                background: `linear-gradient(to right, ${T.accent}, ${T.green})`,
                transition: "width 0.4s ease",
              }} />
            </div>
            <div style={{ width: 40, fontSize: 11, fontFamily: T.mono, color: s.rate >= 0 ? T.green : T.red, textAlign: "right" }}>
              {s.rate.toFixed(0)}%
            </div>
          </div>
        ))}
      </Card>

      {/* Category comparison */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.sub, textTransform: "uppercase", letterSpacing: 1.5 }}>
            Category Trends
          </div>
          <div style={{ fontSize: 11, color: T.sub }}>
            {monthLabel(prevYM)} vs {monthLabel(curYM)}
          </div>
        </div>
        {allCats.map((cat, i) => {
          const cur  = curCats[cat]  || 0;
          const prev = prevCats[cat] || 0;
          const change = prev > 0 ? ((cur - prev) / prev) * 100 : null;
          const up = change !== null && change > 0;
          return (
            <div key={cat} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "8px 0", borderBottom: `1px solid ${T.border}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: DOT_COLORS[i % DOT_COLORS.length] }} />
                <span style={{ fontSize: 13, color: T.text }}>{cat}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 12, fontFamily: T.mono, color: T.sub }}>{fmt(prev)}</span>
                <span style={{ fontSize: 11, color: T.sub, margin: "0 4px" }}>→</span>
                <span style={{ fontSize: 12, fontFamily: T.mono, color: T.text }}>{fmt(cur)}</span>
                {change !== null && (
                  <span style={{ fontSize: 11, color: up ? T.red : T.green, marginLeft: 6 }}>
                    {up ? "+" : ""}{change.toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
