import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useTheme } from "../theme/ThemeContext";
import { useIsMobile } from "../hooks/useMediaQuery";
import Card from "../components/Card";
import ProgressBar from "../components/ProgressBar";
import CustomTooltip from "../components/CustomTooltip";
import PageHeader from "../components/PageHeader";
import SectionHeader from "../components/SectionHeader";
import { useChartDefaults } from "../theme/chart";
import {
  getMonths, filterByMonth, totalExpenses, calcNetWorth,
  fmt, MONTH_LABELS,
} from "../utils/compute";

// Goal colors are token keys assigned by position, resolved per theme.
const GOAL_COLORS = ["green", "accent", "yellow", "red"];

const MILESTONES = [
  { label: "First R50k net worth",   done: false, date: "Target: Dec 2026" },
  { label: "6-month emergency fund", done: false, date: "Target: Mar 2027" },
  { label: "Pay off credit card",    done: true,  date: "Completed Apr 2026" },
];

// Deadline can be "Mar 2027" (typed) or "2027-03-01" (a Sheets date cell).
function monthsUntil(deadlineStr) {
  let target;
  if (/^\d{4}-\d{2}/.test(deadlineStr)) {
    target = new Date(deadlineStr + (deadlineStr.length === 7 ? "-01" : ""));
  } else {
    const [mon, yr] = deadlineStr.split(" ");
    target = new Date(`${mon} 1, ${yr}`);
  }
  if (isNaN(target.getTime())) return 1;
  const now = new Date();
  return Math.max(1, (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth()));
}

function GoalCard({ goal, colorKey }) {
  const { T } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const pct       = goal.target > 0 ? Math.min(100, (goal.saved / goal.target) * 100) : 0;
  const remaining = goal.target - goal.saved;
  const months    = monthsUntil(goal.deadline);
  const monthly   = remaining / months;
  const color     = T[colorKey] || T.accent;

  return (
    <Card style={{ cursor: "pointer", marginBottom: 0 }} >
      <div onClick={() => setExpanded(e => !e)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>{goal.icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{goal.name}</div>
              <div style={{ fontSize: 11, color: T.sub }}>{goal.deadline}</div>
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: T.mono, color }}>
            {pct.toFixed(0)}%
          </div>
        </div>
        <div style={{ fontSize: 12, fontFamily: T.mono, color: T.sub, marginBottom: 8 }}>
          {fmt(goal.saved)} <span style={{ color: T.border2 }}>/</span> {fmt(goal.target)}
        </div>
        <ProgressBar value={pct} color={color} height={4} />
      </div>

      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", gap: 24, fontSize: 12 }}>
            <div>
              <div style={{ color: T.sub, marginBottom: 2 }}>Remaining</div>
              <div style={{ fontFamily: T.mono, fontWeight: 600, color: T.text }}>{fmt(remaining)}</div>
            </div>
            <div>
              <div style={{ color: T.sub, marginBottom: 2 }}>Monthly needed</div>
              <div style={{ fontFamily: T.mono, fontWeight: 600, color: T.text }}>{fmt(monthly)}</div>
            </div>
            <div>
              <div style={{ color: T.sub, marginBottom: 2 }}>Months left</div>
              <div style={{ fontFamily: T.mono, fontWeight: 600, color: T.text }}>{months}</div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function Planning({ transactions, assets, goals = [], netWorthHistory = [] }) {
  const { T } = useTheme();
  const isMobile = useIsMobile();
  const chart = useChartDefaults();
  const { netWorth } = useMemo(() => calcNetWorth(assets), [assets]);

  const months = useMemo(() => getMonths(transactions), [transactions]);

  // Average monthly savings over last 3 months
  const avgSavings = useMemo(() => {
    const last3 = months.slice(0, 3);
    if (!last3.length) return 0;
    const total = last3.reduce((sum, ym) => {
      const [y, m] = ym.split("-").map(Number);
      const tx     = filterByMonth(transactions, y, m);
      const income = tx.filter(t => t.category === "Income").reduce((s, t) => s + t.amount, 0);
      const exp    = totalExpenses(tx);
      return sum + (income - exp);
    }, 0);
    return total / last3.length;
  }, [months, transactions]);

  // Real history (monthly snapshots) followed by a 12-month forecast.
  const forecastData = useMemo(() => {
    const now = new Date();
    const history = netWorthHistory.map(h => {
      const d = new Date(h.date + "T00:00:00");
      return {
        label: `${MONTH_LABELS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
        actual: h.net,
      };
    });
    const forecast = Array.from({ length: 13 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const label = `${MONTH_LABELS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
      return {
        label,
        projected:    Math.round(netWorth + avgSavings * i),
        conservative: Math.round(netWorth + avgSavings * 0.8 * i),
        // anchor the forecast lines to the last actual point
        ...(i === 0 && history.length ? { actual: netWorth } : {}),
      };
    });
    return [...history, ...forecast];
  }, [netWorth, avgSavings, netWorthHistory]);

  return (
    <div style={{ maxWidth: 960 }}>
      <PageHeader title="Planning" />

      {/* Savings Goals (from the Goals sheet tab, editable in Settings) */}
      <SectionHeader>Savings Goals</SectionHeader>
      {goals.length === 0 ? (
        <Card>
          <div style={{ fontSize: 12, color: T.sub }}>
            No goals yet — add them in Settings.
          </div>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 12 }}>
          {goals.map((g, i) => (
            <GoalCard key={g.name} goal={g} colorKey={GOAL_COLORS[i % GOAL_COLORS.length]} />
          ))}
        </div>
      )}

      {/* Net Worth Forecast */}
      <SectionHeader style={{ margin: "20px 0 12px" }}>Net Worth Forecast</SectionHeader>
      <Card>
        <div style={{ fontSize: 12, color: T.sub, marginBottom: 4 }}>
          {netWorthHistory.length > 1 && `${netWorthHistory.length} months of history · `}
          Forecast from avg monthly savings of {fmt(Math.max(0, avgSavings))} over last 3 months
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={forecastData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ ...chart.tick, fontSize: 9 }} axisLine={chart.axisLine} tickLine={chart.tickLine} interval={2} />
            <YAxis tickFormatter={chart.kFormat} tick={chart.tick} axisLine={chart.axisLine} tickLine={chart.tickLine} domain={["auto", "auto"]} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            {netWorthHistory.length > 0 && (
              <Line
                type="monotone" dataKey="actual" name="Actual"
                stroke={T.green} strokeWidth={2.5}
                dot={{ fill: T.green, r: 2, strokeWidth: 0 }}
              />
            )}
            <Line
              type="monotone" dataKey="projected" name="Projected"
              stroke={T.yellow} strokeWidth={2} strokeDasharray="5 3"
              dot={false}
            />
            <Line
              type="monotone" dataKey="conservative" name="Conservative"
              stroke={T.accent} strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Milestones */}
      <SectionHeader style={{ margin: "20px 0 12px" }}>Milestones</SectionHeader>
      <Card>
        {MILESTONES.map((m, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 0",
            borderBottom: i < MILESTONES.length - 1 ? `1px solid ${T.border}` : "none",
          }}>
            {m.done ? (
              <div style={{
                width: 20, height: 20, borderRadius: "50%",
                background: T.green, display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 11, color: "#fff" }}>✓</span>
              </div>
            ) : (
              <div style={{
                width: 20, height: 20, borderRadius: "50%",
                border: `2px solid ${T.border2}`, flexShrink: 0,
              }} />
            )}
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 13, color: m.done ? T.sub : T.text,
                textDecoration: m.done ? "line-through" : "none",
              }}>
                {m.label}
              </div>
              <div style={{ fontSize: 11, color: T.sub, marginTop: 1 }}>{m.date}</div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
