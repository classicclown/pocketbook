import { useMemo } from "react";
import { BarChart, Bar, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { T } from "../tokens";
import Card from "../components/Card";
import ProgressBar from "../components/ProgressBar";
import StatCard from "../components/StatCard";
import CustomTooltip from "../components/CustomTooltip";
import {
  filterByMonth, totalExpenses, sumByCategory,
  calcNetWorth, fmt, monthLabel, MONTH_LABELS,
} from "../utils/compute";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Overview({ transactions, budgets, assets, isMobile }) {
  const nowYear     = new Date().getFullYear();
  const nowMonth    = new Date().getMonth() + 1;
  const nowDay      = new Date().getDate();
  const prevMonth   = nowMonth === 1 ? 12 : nowMonth - 1;
  const prevYear    = nowMonth === 1 ? nowYear - 1 : nowYear;

  const currentTx   = useMemo(() => filterByMonth(transactions, nowYear, nowMonth),  [transactions, nowYear, nowMonth]);
  const prevTx      = useMemo(() => filterByMonth(transactions, prevYear, prevMonth), [transactions, prevYear, prevMonth]);

  const income      = useMemo(() => currentTx.filter(t => t.category === "Income" && t.currency === "ZAR").reduce((s, t) => s + t.amount, 0), [currentTx]);
  const spent       = useMemo(() => totalExpenses(currentTx), [currentTx]);
  const saved       = income - spent;
  const savingsRate = income > 0 ? (saved / income) * 100 : 0;

  const prevSpent   = useMemo(() => totalExpenses(prevTx), [prevTx]);
  const spentDelta  = prevSpent > 0 ? ((spent - prevSpent) / prevSpent) * 100 : 0;

  const { totalAssets, totalLiabilities, netWorth } = useMemo(() => calcNetWorth(assets), [assets]);

  // 6-month chart data
  const last6 = useMemo(() => {
    const all = [];
    for (let i = 5; i >= 0; i--) {
      const d  = new Date(nowYear, nowMonth - 1 - i, 1);
      const y2 = d.getFullYear();
      const m2 = d.getMonth() + 1;
      const ym = `${y2}-${String(m2).padStart(2, "0")}`;
      const tx = filterByMonth(transactions, y2, m2);
      all.push({ ym, label: MONTH_LABELS[m2 - 1], total: totalExpenses(tx) });
    }
    return all;
  }, [transactions, nowYear, nowMonth]);

  // Projected spend
  const daysInMonth = new Date(nowYear, nowMonth, 0).getDate();
  const dayOfMonth  = nowDay;
  const projected   = dayOfMonth > 0 ? (spent / dayOfMonth) * daysInMonth : spent;
  const totalBudget = Object.values(budgets).reduce((s, v) => s + v, 0);
  const projectedPct = totalBudget > 0 ? (projected / totalBudget) * 100 : 0;

  // Budget vs actual
  const catSpend = useMemo(() => sumByCategory(currentTx.filter(t => t.category !== "Income")), [currentTx]);

  const currentYM = `${nowYear}-${String(nowMonth).padStart(2, "0")}`;

  return (
    <div style={{ maxWidth: 960 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: T.sub, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>
          {monthLabel(currentYM)}
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, color: T.text }}>
          {greeting()}, Ryan
        </div>
      </div>

      {/* Net Worth Banner */}
      <div style={{
        background: T.text,
        borderRadius: T.radius,
        padding: "20px 24px",
        marginBottom: 12,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>
          Net Worth
        </div>
        <div style={{ fontSize: 38, fontWeight: 700, fontFamily: T.mono, color: "#FFFFFF", marginBottom: 12, lineHeight: 1 }}>
          {fmt(netWorth)}
        </div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <div>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginRight: 6 }}>Assets</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#FFFFFF", fontFamily: T.mono }}>{fmt(totalAssets)}</span>
          </div>
          <div>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginRight: 6 }}>Liabilities</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#FFFFFF", fontFamily: T.mono }}>{fmt(totalLiabilities)}</span>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <StatCard
          label="Income"
          value={fmt(income)}
          subValue={income === 0 ? "No income recorded" : "this month"}
          subColor={T.sub}
        />
        <StatCard
          label="Spent"
          value={fmt(spent)}
          subValue={prevSpent > 0 ? `${spentDelta > 0 ? "+" : ""}${spentDelta.toFixed(0)}% vs last month` : "no prior data"}
          subColor={spentDelta > 10 ? T.red : spentDelta < -5 ? T.green : T.sub}
        />
        <StatCard
          label="Saved"
          value={fmt(Math.max(0, saved))}
          subValue={income > 0 ? `${savingsRate.toFixed(0)}% savings rate` : "—"}
          subColor={savingsRate >= 30 ? T.green : savingsRate >= 15 ? T.yellow : T.red}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
        {/* Left column */}
        <div>
          {/* Savings Rate */}
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.sub, textTransform: "uppercase", letterSpacing: 1.5 }}>Savings Rate</div>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: T.mono, color: T.green }}>
                {savingsRate.toFixed(0)}%
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ flex: 1, background: T.dim, height: 4, position: "relative" }}>
                <div style={{ width: `${Math.min(100, savingsRate)}%`, height: 4, background: T.green }} />
                {/* Target marker at 30% */}
                <div style={{
                  position: "absolute", left: "30%", top: -3, width: 1, height: 10, background: T.border2,
                }} />
              </div>
              <div style={{ fontSize: 10, color: T.sub, whiteSpace: "nowrap" }}>30% target</div>
            </div>
            <div style={{ fontSize: 11, color: savingsRate >= 30 ? T.green : T.red }}>
              {savingsRate >= 30
                ? `${(savingsRate - 30).toFixed(0)}% above target`
                : `${(30 - savingsRate).toFixed(0)}% below target`}
            </div>
          </Card>

          {/* Projected Spend */}
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.sub, textTransform: "uppercase", letterSpacing: 1.5 }}>Projected Spend</div>
              <div style={{ fontSize: 12, fontFamily: T.mono, color: T.text }}>
                {fmt(projected)} <span style={{ color: T.sub }}>/ {fmt(totalBudget)}</span>
              </div>
            </div>
            <ProgressBar value={projectedPct} color={projectedPct > 90 ? T.red : T.accent} height={4} />
            <div style={{ fontSize: 11, color: T.sub, marginTop: 6 }}>
              {projectedPct.toFixed(0)}% of monthly budget · {daysInMonth - dayOfMonth} days remaining
            </div>
          </Card>

          {/* 6-Month Bar Chart */}
          <Card style={{ marginBottom: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.sub, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>
              6-Month Spending
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={last6} barSize={28} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: T.sub }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: T.sub }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" radius={[2, 2, 0, 0]}>
                  {last6.map((entry, i) => (
                    <Cell key={i} fill={entry.ym === currentYM ? T.accent : T.border2} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Right column — Budget vs Actual */}
        <div>
          <Card style={{ marginBottom: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.sub, textTransform: "uppercase", letterSpacing: 1.5 }}>
                Budget vs Actual
              </div>
              <div style={{ fontSize: 10, color: T.sub }}>{monthLabel(currentYM)}</div>
            </div>
            {Object.entries(budgets).map(([cat, limit]) => {
              const actual = catSpend[cat] || 0;
              const pct    = limit > 0 ? (actual / limit) * 100 : 0;
              const over   = actual > limit;
              return (
                <div key={cat} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ fontSize: 13, color: T.text }}>{cat}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {over && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: T.red,
                          background: T.redBg, padding: "1px 5px", borderRadius: 2, letterSpacing: 0.5,
                        }}>OVER</span>
                      )}
                      <span style={{ fontSize: 12, fontFamily: T.mono, color: over ? T.red : T.text }}>
                        {fmt(actual)} <span style={{ color: T.sub }}>/ {fmt(limit)}</span>
                      </span>
                    </div>
                  </div>
                  <ProgressBar
                    value={pct}
                    color={over ? T.red : `${T.accent}B3`}
                    height={3}
                  />
                </div>
              );
            })}
          </Card>
        </div>
      </div>
    </div>
  );
}
