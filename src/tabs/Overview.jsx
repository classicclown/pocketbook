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
import DetailSheet from "../components/DetailSheet";
import TileFrame from "../components/TileFrame";
import CustomTile from "../components/CustomTile";
import TileBuilder from "../components/TileBuilder";
import { useChartDefaults } from "../theme/chart";
import {
  filterByMonth, totalExpenses, sumByCategory,
  calcNetWorth, fmt, monthLabel, MONTH_LABELS,
} from "../utils/compute";
import { projectMonth } from "../utils/projection";
import { useTags } from "../hooks/useTags";
import { detectRecurring, upcomingRecurringTotal, excludeRecurringVendor } from "../utils/recurring";
import { useDashboard } from "../hooks/useDashboard";
import { describeTile } from "../utils/tiles";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// Built-in tiles offered in the "Add a tile" picker, with their default width.
const BUILTINS = [
  { id: "netWorth",       label: "Net Worth",        size: "full" },
  { id: "summary",        label: "Monthly Summary",  size: "full" },
  { id: "leftToSpend",    label: "Left to Spend",    size: "half" },
  { id: "savingsRate",    label: "Savings Rate",     size: "half" },
  { id: "projected",      label: "Projected Spend",  size: "half" },
  { id: "chart6mo",       label: "6-Month Spending", size: "half" },
  { id: "budgetVsActual", label: "Budget vs Actual", size: "half" },
  { id: "recurring",      label: "Recurring",        size: "half" },
];

export default function Overview({ transactions, budgets, assets, fixed = [], investments = [] }) {
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

  const investmentsTotal = useMemo(() => investments.reduce((s, i) => s + i.value, 0), [investments]);
  const { totalAssets, totalLiabilities, netWorth } = useMemo(() => {
    const base = calcNetWorth(assets);
    return {
      totalAssets: base.totalAssets + investmentsTotal,
      totalLiabilities: base.totalLiabilities,
      netWorth: base.netWorth + investmentsTotal,
    };
  }, [assets, investmentsTotal]);

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
  const { getTag, options: tagOptions } = useTags();
  const proj = useMemo(
    () => projectMonth(transactions, { year: nowYear, month: nowMonth, getTag, fixed }),
    [transactions, nowYear, nowMonth, getTag, fixed]
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
  const leftToSpend = income - spent - upcomingBills - proj.upcomingFixedTotal;
  const recurringMonthly = recurring.reduce((s, r) => s + r.avgAmount, 0);

  const dismissRecurring = (vendor) => {
    excludeRecurringVendor(vendor);
    setRecurringVersion(v => v + 1);
  };

  const currentYM = `${nowYear}-${String(nowMonth).padStart(2, "0")}`;

  // Data-source options for the custom-tile builder
  const categoryNames = useMemo(
    () => Array.from(new Set([...Object.keys(budgets), ...transactions.map(t => t.category)]
      .filter(c => c && c !== "Uncategorised" && c !== "Transfer"))).sort(),
    [budgets, transactions]
  );
  const vendorNames = useMemo(
    () => Array.from(new Set(transactions.map(t => t.vendor).filter(Boolean))).sort(),
    [transactions]
  );

  // Dashboard state
  const { items, custom, add, remove, move, setSize, saveCustom, reset } = useDashboard("pb:dashboard");
  const [editing, setEditing] = useState(false);
  const [picker, setPicker]   = useState(false);
  const [builder, setBuilder] = useState(null); // null | { edit?: def }

  const onBoard = new Set(items.map(it => it.id));
  const availableBuiltins = BUILTINS.filter(b => !onBoard.has(b.id));

  const editButtonStyle = {
    fontSize: 12, fontWeight: 600, padding: "5px 12px",
    borderRadius: T.radius, border: `1px solid ${T.border}`,
    background: "transparent", color: T.sub,
    cursor: "pointer", fontFamily: T.font,
  };

  // ── Built-in tile content ──────────────────────────────────────────────────
  const builtinContent = {
    netWorth: (
      <div style={{ background: T.heroBg, borderRadius: T.radius, padding: "20px 24px" }}>
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
          {investmentsTotal > 0 && (
            <div>
              <span style={{ fontSize: 11, color: T.heroFaint, marginRight: 6 }}>Investments</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.heroText, fontFamily: T.mono }}>{fmt(investmentsTotal)}</span>
            </div>
          )}
        </div>
      </div>
    ),

    summary: (
      <div style={{ display: "flex", gap: 8 }}>
        <StatCard label="Income" value={fmt(income)}
          subValue={income === 0 ? "No income recorded" : "this month"} subColor={T.sub} />
        <StatCard label="Spent" value={fmt(spent)}
          subValue={prevSpent > 0 ? `${spentDelta > 0 ? "+" : ""}${spentDelta.toFixed(0)}% vs last month` : "no prior data"}
          subColor={spentDelta > 10 ? T.red : spentDelta < -5 ? T.green : T.sub} />
        <StatCard label="Saved" value={fmt(Math.max(0, saved))}
          subValue={income > 0 ? `${savingsRate.toFixed(0)}% savings rate` : "—"}
          subColor={savingsRate >= 30 ? T.green : savingsRate >= 15 ? T.yellow : T.red} />
      </div>
    ),

    leftToSpend: (
      <Card style={{ marginBottom: 0 }}>
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
            {proj.upcomingFixedTotal > 0 && <> − {fmt(proj.upcomingFixedTotal)} upcoming fixed</>}
          </div>
        </div>
        {income === 0 && (
          <div style={{ fontSize: 11, color: T.yellow, marginTop: 8 }}>
            No income recorded this month yet — treat this as spend only.
          </div>
        )}
      </Card>
    ),

    savingsRate: (
      <Card style={{ marginBottom: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.sub, textTransform: "uppercase", letterSpacing: 1.5 }}>Savings Rate</div>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: T.mono, color: T.green }}>
            {savingsRate.toFixed(0)}%
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div style={{ flex: 1, background: T.dim, height: 4, position: "relative" }}>
            <div style={{ width: `${Math.min(100, savingsRate)}%`, height: 4, background: T.green }} />
            <div style={{ position: "absolute", left: "30%", top: -3, width: 1, height: 10, background: T.border2 }} />
          </div>
          <div style={{ fontSize: 10, color: T.sub, whiteSpace: "nowrap" }}>30% target</div>
        </div>
        <div style={{ fontSize: 11, color: savingsRate >= 30 ? T.green : T.red }}>
          {savingsRate >= 30
            ? `${(savingsRate - 30).toFixed(0)}% above target`
            : `${(30 - savingsRate).toFixed(0)}% below target`}
        </div>
      </Card>
    ),

    projected: (
      <Card style={{ marginBottom: 0 }}>
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
    ),

    chart6mo: (
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
    ),

    budgetVsActual: (
      <Card style={{ marginBottom: 0 }}>
        <SectionHeader right={monthLabel(currentYM)} style={{ marginBottom: 16 }}>
          Budget vs Actual
        </SectionHeader>
        {Object.entries(budgets).map(([cat, limit]) => {
          const actual = catSpend[cat] || 0;
          const pct    = limit > 0 ? (actual / limit) * 100 : 0;
          const over   = actual > limit;
          const catProjected = proj.byCategory[cat]?.projected;
          const projMarker = limit > 0 && catProjected > actual ? (catProjected / limit) * 100 : null;
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
              <ProgressBar value={pct} color={over ? T.red : `${T.accent}B3`} height={3} marker={projMarker} />
            </div>
          );
        })}
      </Card>
    ),

    recurring: (
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
                  style={{ background: "none", border: "none", color: T.sub, cursor: "pointer", fontSize: 11, padding: 2, lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </Card>
    ),
  };

  const tileLabel = (id) => {
    const b = BUILTINS.find(x => x.id === id);
    if (b) return b.label;
    const d = custom[id];
    return d ? (d.title || describeTile(d)) : id;
  };

  const tileNode = (id) => {
    if (builtinContent[id]) return builtinContent[id];
    if (custom[id]) return <CustomTile def={custom[id]} transactions={transactions} />;
    return null; // stale id — skip
  };

  const openPicker = () => { setEditing(true); setPicker(true); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <PageHeader eyebrow={monthLabel(currentYM)} title={`${greeting()}, Ryan`} />
        <div style={{ display: "flex", gap: 6, paddingTop: 4, flexWrap: "wrap" }}>
          {editing && (
            <button onClick={() => setPicker(true)} style={{ ...editButtonStyle, borderColor: T.accent, color: T.accent, background: T.accentBg }}>
              ＋ Add tile
            </button>
          )}
          {editing && items.length > 0 && (
            <button onClick={() => { if (window.confirm("Clear your whole dashboard?")) reset(); }} style={editButtonStyle}>
              Reset
            </button>
          )}
          <button
            onClick={() => setEditing(e => !e)}
            style={editing ? { ...editButtonStyle, borderColor: T.accent, color: T.accent, background: T.accentBg } : editButtonStyle}
          >
            {editing ? "Done" : "Edit"}
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <div style={{ textAlign: "center", padding: "36px 16px" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 6 }}>Your dashboard is empty</div>
            <div style={{ fontSize: 12, color: T.sub, marginBottom: 18, maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}>
              Build your home page from built-in widgets — net worth, spending, budgets — or create your own custom metric tiles.
            </div>
            <button
              onClick={openPicker}
              style={{
                fontSize: 13, fontWeight: 600, padding: "9px 20px", borderRadius: T.radius,
                border: "none", background: T.accent, color: "#fff", cursor: "pointer", fontFamily: T.font,
              }}
            >
              ＋ Add a tile
            </button>
          </div>
        </Card>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: 12, alignItems: "start",
        }}>
          {items.map((it, i) => {
            const node = tileNode(it.id);
            if (!node) return null;
            const full = isMobile || it.size === "full";
            return (
              <div key={it.id} style={{ gridColumn: full ? "1 / -1" : "auto" }}>
                <TileFrame
                  editing={editing}
                  label={tileLabel(it.id)}
                  size={it.size}
                  canUp={i > 0}
                  canDown={i < items.length - 1}
                  onUp={() => move(it.id, -1)}
                  onDown={() => move(it.id, 1)}
                  onToggleSize={() => setSize(it.id, it.size === "full" ? "half" : "full")}
                  onRemove={() => remove(it.id)}
                  onEdit={it.id.startsWith("custom:") ? () => setBuilder({ edit: custom[it.id] }) : undefined}
                >
                  {node}
                </TileFrame>
              </div>
            );
          })}
        </div>
      )}

      {/* Add-tile picker */}
      {picker && (
        <DetailSheet title="Add a tile" subtitle="Choose a widget or build your own" onClose={() => setPicker(false)}>
          {availableBuiltins.length === 0 ? (
            <div style={{ fontSize: 12, color: T.sub, marginBottom: 12 }}>
              All built-in tiles are on your dashboard.
            </div>
          ) : (
            availableBuiltins.map(b => (
              <div key={b.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 0", borderBottom: `1px solid ${T.border}`, gap: 12,
              }}>
                <span style={{ fontSize: 13, color: T.text }}>{b.label}</span>
                <button
                  onClick={() => add(b.id, b.size)}
                  style={{
                    fontSize: 12, fontWeight: 600, padding: "5px 14px", borderRadius: T.radius,
                    border: `1px solid ${T.accent}`, background: T.accentBg, color: T.accent,
                    cursor: "pointer", fontFamily: T.font,
                  }}
                >
                  Add
                </button>
              </div>
            ))
          )}
          <button
            onClick={() => { setPicker(false); setBuilder({}); }}
            style={{
              marginTop: 14, fontSize: 13, fontWeight: 600, padding: "9px 14px", width: "100%",
              borderRadius: T.radius, border: `1px dashed ${T.border2}`,
              background: "transparent", color: T.text, cursor: "pointer", fontFamily: T.font,
            }}
          >
            ＋ Create custom tile
          </button>
        </DetailSheet>
      )}

      {/* Custom-tile builder */}
      {builder && (
        <TileBuilder
          initial={builder.edit}
          categories={categoryNames}
          vendors={vendorNames}
          tags={tagOptions}
          onSave={(def) => { saveCustom(def); setBuilder(null); }}
          onClose={() => setBuilder(null)}
        />
      )}
    </div>
  );
}
