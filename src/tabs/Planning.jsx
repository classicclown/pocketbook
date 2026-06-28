import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { T } from "../tokens";
import Card from "../components/Card";
import ProgressBar from "../components/ProgressBar";
import CustomTooltip from "../components/CustomTooltip";
import {
  getMonths, filterByMonth, totalExpenses, calcNetWorth,
  fmt, MONTH_LABELS,
} from "../utils/compute";

const GOALS = [
  { name: "Emergency Fund", target: 20000, saved: 14500, deadline: "Mar 2027", icon: "🛡️", color: T.green },
  { name: "Holiday",        target: 8000,  saved: 3200,  deadline: "Dec 2026", icon: "✈️", color: T.accent },
  { name: "New Laptop",     target: 3500,  saved: 1200,  deadline: "Sep 2026", icon: "💻", color: "#7C6FCD" },
];

const MILESTONES = [
  { label: "First R50k net worth",   done: false, date: "Target: Dec 2026" },
  { label: "6-month emergency fund", done: false, date: "Target: Mar 2027" },
  { label: "Pay off credit card",    done: true,  date: "Completed Apr 2026" },
];

function monthsUntil(deadlineStr) {
  const [mon, yr] = deadlineStr.split(" ");
  const target = new Date(`${mon} 1, ${yr}`);
  const now = new Date();
  return Math.max(1, (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth()));
}

function GoalCard({ goal }) {
  const [expanded, setExpanded] = useState(false);
  const pct       = Math.min(100, (goal.saved / goal.target) * 100);
  const remaining = goal.target - goal.saved;
  const months    = monthsUntil(goal.deadline);
  const monthly   = remaining / months;

  return (
    <Card style={{ cursor: "pointer" }} >
      <div onClick={() => setExpanded(e => !e)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>{goal.icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{goal.name}</div>
              <div style={{ fontSize: 11, color: T.sub }}>{goal.deadline}</div>
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: T.mono, color: goal.color }}>
            {pct.toFixed(0)}%
          </div>
        </div>
        <div style={{ fontSize: 12, fontFamily: T.mono, color: T.sub, marginBottom: 8 }}>
          {fmt(goal.saved)} <span style={{ color: T.border2 }}>/</span> {fmt(goal.target)}
        </div>
        <ProgressBar value={pct} color={goal.color} height={4} />
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

export default function Planning({ transactions, assets }) {
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

  // Forecast next 12 months
  const forecastData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 13 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const label = `${MONTH_LABELS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
      return {
        label,
        projected:    Math.round(netWorth + avgSavings * i),
        conservative: Math.round(netWorth + avgSavings * 0.8 * i),
      };
    });
  }, [netWorth, avgSavings]);

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: T.text, marginBottom: 20 }}>Planning</div>

      {/* Savings Goals */}
      <div style={{ fontSize: 11, fontWeight: 600, color: T.sub, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>
        Savings Goals
      </div>
      {GOALS.map(g => <GoalCard key={g.name} goal={g} />)}

      {/* Net Worth Forecast */}
      <div style={{ fontSize: 11, fontWeight: 600, color: T.sub, textTransform: "uppercase", letterSpacing: 1.5, margin: "20px 0 12px" }}>
        Net Worth Forecast
      </div>
      <Card>
        <div style={{ fontSize: 12, color: T.sub, marginBottom: 4 }}>
          Based on avg monthly savings of {fmt(Math.max(0, avgSavings))} over last 3 months
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={forecastData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: T.sub }} axisLine={false} tickLine={false} interval={2} />
            <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: T.sub }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
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
      <div style={{ fontSize: 11, fontWeight: 600, color: T.sub, textTransform: "uppercase", letterSpacing: 1.5, margin: "20px 0 12px" }}>
        Milestones
      </div>
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
