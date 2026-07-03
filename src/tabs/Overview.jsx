import { useMemo, useState } from "react";
import { BarChart, Bar, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useTheme } from "../theme/ThemeContext";
import { useIsMobile } from "../hooks/useMediaQuery";
import Card from "../components/Card";
import ProgressBar from "../components/ProgressBar";
import StatCard from "../components/StatCard";
import CustomTooltip from "../components/CustomTooltip";
import PageHeader from "../components/PageHeader";
import SectionHeader from "../components/SectionHeader";
import { useChartDefaults } from "../theme/chart";
import {
  filterByMonth, totalExpenses, sumByCategory,
  calcNetWorth, fmt, monthLabel, MONTH_LABELS,
} from "../utils/compute";
import { projectMonth } from "../utils/projection";
import { useTags } from "../hooks/useTags";
import { detectRecurring, upcomingRecurringTotal, excludeRecurringVendor } from "../utils/recurring";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Overview({ transactions, budgets, assets }) {
  const { T } = useTheme();
  const isMobile = useIsMobile();
  const chart = useChartDefaults();
  const nowYear     = new Date().getFullYear();
  const nowMonth    = new Date().getMonth() + 1;
  const prevMonth   = nowMonth === 1 ? 12 : nowMonth - 1;
  const prevYear    = nowMonth === 1 ? nowYear - 1 : nowYear;

  const currentTx   = useMemo(() => filterByMonth(transactions, nowYear, nowMonth),  [transactions, nowYear, nowMonth]);
  const prevTx      = useMemo(() => filterByMonth(transactions, prevYear, prevMonth), [transactions, prevYear, prevMonth]);

  const income      = useMemo(() => currentTx.filter(t => t.category === "Income").reduce((s, t) => s + t.amount, 0), [currentTx]);
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

  // Projected spend — daily run rate extrapolated to month-end, one-offs excluded
  const { getTag } = useTags();
  const proj = useMemo(
    () => projectMonth(transactions, { year: nowYear, month: nowMonth, getTag }),
    [transactions, nowYear, nowMonth, getTag]
  );
  const projected   = proj.projected;
  const totalBudget = Object.values(budgets).reduce((s, v) => s + v, 0);
  const projectedPct = totalBudget > 0 ? (projected / totalBudget) * 100 : 0;

  // Budget vs actual
  const catSpend = useMemo(() => sumByCategory(currentTx.filter(t => t.category !== "Income")), [currentTx]);

  // Recurring bills + left-to-spend (Simplifi-style spending plan)
  const [recurringVersion, setRecurringVersion] = useState(0);
  const recurring = useMemo(
    () => detectRecurring(transactions),
    // recurringVersion re-runs detection after a dismissal updates localStorage
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions, recurringVersion]
  );
  const upcomingBills = useMemo(() => upcomingRecurringTotal(recurring), [recurring]);
  const leftToSpend = income - spent - upcomingBills;
  const recurringMonthly = recurring.reduce((s, r) => s + r.avgAmount, 0);

  const dismissRecurring = (vendor) => {
    excludeRecurringVendor(vendor);
    setRecurringVersion(v => v + 1);
  };

  const currentYM = `${nowYear}-${String(nowMonth).padStart(2, "0")}`;

  return (
    <div style={{ maxWidth: 960 }}>
      <PageHeader eyebrow={monthLabel(currentYM)} title={`${greeting()}, Ryan`} />

      {/* Net Worth Banner */}
      <div style={{
        background: T.heroBg,
        borderRadius: T.radius,
        padding: "20px 24px",
        marginBottom: 12,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: T.heroSub, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>
          Net Worth
        </div>
        <div style={{ fontSize: 38, fontWeight: 700, fontFamily: T.mono, color: T.heroText, marginBottom: 12, lineHeight: 1 }}>
          {fmt(netWorth)}
        </div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <div>
            <span style={{ fontSize: 11, color: T.heroFaint, marginRight: 6 }}>Assets</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: T.heroText, fontFamily: T.mono }}>{fmt(totalAssets)}</span>
          </div>
          <div>
            <span style={{ fontSize: 11, color: T.heroFaint, marginRight: 6 }}>Liabilities</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: T.heroText, fontFamily: T.mono }}>{fmt(totalLiabilities)}</span>
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

      {/* Left to spend — income minus spend so far minus expected bills */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
          <div>
            <SectionHeader style={{ marginBottom: 6 }}>Left to Spend</SectionHeader>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: T.mono, color: leftToSpend >= 0 ? T.green : T.red, lineHeight: 1 }}>
              {leftToSpend < 0 && "−"}{fmt(Math.abs(leftToSpend))}
            </div>
          </div>
          <div style={{ fontSize: 11, color: T.sub, textAlign: "right" }}>
            {fmt(income)} income − {fmt(spent)} spent
            {upcomingBills > 0 && <> − {fmt(upcomingBills)} upcoming bills</>}
          </div>
        </div>
        {income === 0 && (
          <div style={{ fontSize: 11, color: T.yellow, marginTop: 8 }}>
            No income recorded this month yet — treat this as spend only.
          </div>
        )}
      </Card>

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
              {projectedPct.toFixed(0)}% of monthly budget · {proj.daysInMonth - proj.elapsedDays} days remaining
              {proj.oneOffSpent > 0 && " · one-offs not extrapolated"}
            </div>
            {proj.lowConfidence && (
              <div style={{ fontSize: 11, color: T.yellow, marginTop: 4 }}>
                Early in the month — projection has low confidence
              </div>
            )}
          </Card>

          {/* 6-Month Bar Chart */}
          <Card style={{ marginBottom: 0 }}>
            <SectionHeader>6-Month Spending</SectionHeader>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={last6} barSize={28} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" tick={chart.tick} axisLine={chart.axisLine} tickLine={chart.tickLine} />
                <YAxis tickFormatter={chart.kFormat} tick={chart.tick} axisLine={chart.axisLine} tickLine={chart.tickLine} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" radius={[2, 2, 0, 0]}>
                  {last6.map((entry, i) => (
                    <Cell key={i} fill={entry.ym === currentYM ? T.accent : T.chartMuted} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Right column — Budget vs Actual + Recurring */}
        <div>
          <Card>
            <SectionHeader right={monthLabel(currentYM)} style={{ marginBottom: 16 }}>
              Budget vs Actual
            </SectionHeader>
            {Object.entries(budgets).map(([cat, limit]) => {
              const actual = catSpend[cat] || 0;
              const pct    = limit > 0 ? (actual / limit) * 100 : 0;
              const over   = actual > limit;
              const catProjected = proj.byCategory[cat]?.projected;
              const projMarker = limit > 0 && catProjected > actual
                ? (catProjected / limit) * 100
                : null;
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
                    marker={projMarker}
                  />
                </div>
              );
            })}
          </Card>

          {/* Recurring bills & subscriptions */}
          <Card style={{ marginBottom: 0 }}>
            <SectionHeader right={recurring.length ? `${fmt(recurringMonthly)} / month` : null}>
              Recurring
            </SectionHeader>
            {recurring.length === 0 ? (
              <div style={{ fontSize: 12, color: T.sub }}>
                No recurring charges detected yet — needs a few months of history.
              </div>
            ) : (
              recurring.map(r => (
                <div key={r.vendor} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 0", borderBottom: `1px solid ${T.border}`, gap: 10,
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {r.vendor}
                      {r.priceChanged && (
                        <span style={{
                          marginLeft: 6, fontSize: 9, fontWeight: 700, color: T.yellow,
                          background: `${T.yellow}18`, padding: "1px 5px", borderRadius: 2, letterSpacing: 0.5,
                        }}>PRICE ↑</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: T.sub }}>
                      {r.category} · next ~{r.nextExpectedDate}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontFamily: T.mono, color: T.text }}>{fmt(r.avgAmount)}</span>
                    <button
                      onClick={() => dismissRecurring(r.vendor)}
                      title="Not recurring — hide"
                      style={{
                        background: "none", border: "none", color: T.sub,
                        cursor: "pointer", fontSize: 11, padding: 2, lineHeight: 1,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
