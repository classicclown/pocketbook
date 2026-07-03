import { useMemo } from "react";
import { BarChart, Bar, Cell, XAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useTheme } from "../theme/ThemeContext";
import { useChartDefaults } from "../theme/chart";
import CustomTooltip from "./CustomTooltip";
import SectionHeader from "./SectionHeader";
import { categoryStats, merchantStats } from "../utils/insights";
import { fmt, monthLabel } from "../utils/compute";

function Sparkline({ series }) {
  const { T } = useTheme();
  const chart = useChartDefaults();
  return (
    <ResponsiveContainer width="100%" height={90}>
      <BarChart data={series} barSize={22} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <XAxis dataKey="label" tick={chart.tick} axisLine={chart.axisLine} tickLine={chart.tickLine} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="total" radius={[2, 2, 0, 0]}>
          {series.map((entry, i) => (
            <Cell key={i} fill={i === series.length - 1 ? T.accent : T.chartMuted} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function BigStat({ label, value, color }) {
  const { T } = useTheme();
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: T.sub, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: T.mono, color: color || T.text }}>
        {value}
      </div>
    </div>
  );
}

function DeltaChip({ delta, deltaPct, invert }) {
  const { T } = useTheme();
  if (delta === 0) return null;
  const up = delta > 0;
  const bad = invert ? !up : up; // spending up = bad
  const color = bad ? T.red : T.green;
  const bg = bad ? T.redBg : T.greenBg;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, color, background: bg,
      padding: "2px 8px", borderRadius: 3, letterSpacing: 0.3,
    }}>
      {up ? "▲" : "▼"} {fmt(Math.abs(delta))}{deltaPct != null && ` (${Math.abs(deltaPct).toFixed(0)}%)`}
    </span>
  );
}

// Category drill-down: this month vs trailing 3-month average.
export function CategoryDetail({ transactions, category, ym, projected }) {
  const { T } = useTheme();
  const stats = useMemo(() => categoryStats(transactions, category, ym), [transactions, category, ym]);

  return (
    <div>
      <div style={{ display: "flex", gap: 28, marginBottom: 10 }}>
        <BigStat label={monthLabel(ym)} value={fmt(stats.current)} />
        <BigStat label="3-month avg" value={fmt(stats.avg3)} color={T.sub} />
      </div>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <DeltaChip delta={stats.delta} deltaPct={stats.deltaPct} />
        <span style={{ fontSize: 11, color: T.sub }}>vs your 3-month average</span>
      </div>
      {projected != null && projected > stats.current && (
        <div style={{ fontSize: 12, color: T.sub, marginBottom: 16 }}>
          Projected month-end: <strong style={{ fontFamily: T.mono, color: T.text }}>{fmt(projected)}</strong>
        </div>
      )}
      <SectionHeader>Last 6 months</SectionHeader>
      <Sparkline series={stats.series} />
    </div>
  );
}

// Merchant drill-down: totals, frequency, and trend for one vendor.
export function MerchantDetail({ transactions, vendor, ym }) {
  const { T } = useTheme();
  const stats = useMemo(() => merchantStats(transactions, vendor, ym), [transactions, vendor, ym]);

  return (
    <div>
      <div style={{ display: "flex", gap: 28, marginBottom: 16, flexWrap: "wrap" }}>
        <BigStat label="Total spent" value={fmt(stats.total)} />
        <BigStat label="Visits" value={stats.count} />
        <BigStat label="Avg per visit" value={fmt(stats.avgPerVisit)} color={T.sub} />
      </div>
      <div style={{ fontSize: 11, color: T.sub, marginBottom: 16 }}>
        {stats.category && <span>{stats.category} · </span>}
        {stats.firstDate && <span>first seen {stats.firstDate} · last {stats.lastDate}</span>}
      </div>
      <SectionHeader>Last 6 months</SectionHeader>
      <Sparkline series={stats.series} />
    </div>
  );
}
