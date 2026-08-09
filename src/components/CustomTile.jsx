import { useMemo } from "react";
import { BarChart, Bar, Cell, XAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useTheme } from "../theme/ThemeContext";
import { useChartDefaults } from "../theme/chart";
import { useTags } from "../hooks/useTags";
import Card from "./Card";
import SectionHeader from "./SectionHeader";
import ProgressBar from "./ProgressBar";
import CustomTooltip from "./CustomTooltip";
import { fmt } from "../utils/compute";
import { tileValue, tileCompare, tileSeries, describeTile } from "../utils/tiles";

// Renders a user-defined tile (number / progress / trend) from its definition.
export default function CustomTile({ def, transactions }) {
  const { T } = useTheme();
  const chart = useChartDefaults();
  const { getTag } = useTags();

  const value = useMemo(() => tileValue(def, transactions, getTag), [def, transactions, getTag]);
  const compare = useMemo(
    () => (def.type === "number" ? tileCompare(def, transactions, getTag) : null),
    [def, transactions, getTag]
  );
  const series = useMemo(
    () => (def.type === "trend" ? tileSeries(def, transactions, getTag) : null),
    [def, transactions, getTag]
  );

  const title = def.title || describeTile(def);

  return (
    <Card style={{ marginBottom: 0 }}>
      <SectionHeader right={def.title ? undefined : null}>{title}</SectionHeader>

      {def.type === "number" && (
        <>
          <div style={{ fontSize: 26, fontWeight: 700, fontFamily: T.mono, color: T.text, lineHeight: 1 }}>
            {fmt(value)}
          </div>
          {compare != null && (
            <div style={{ fontSize: 11, marginTop: 6, color: T.sub }}>
              {(() => {
                const delta = value - compare;
                const up = delta > 0;
                const label = def.compare === "target" ? "vs target"
                  : def.compare === "avg3" ? "vs 3-mo avg" : "vs last month";
                const color = delta === 0 ? T.sub : up ? T.red : T.green; // spending up = bad
                return (
                  <span style={{ color }}>
                    {up ? "▲" : delta < 0 ? "▼" : ""} {fmt(Math.abs(delta))} {label}
                  </span>
                );
              })()}
            </div>
          )}
          <div style={{ fontSize: 11, color: T.sub, marginTop: compare != null ? 4 : 6 }}>
            {describeTile(def)}
          </div>
        </>
      )}

      {def.type === "progress" && (() => {
        const target = Number(def.target) || 0;
        const pct = target > 0 ? (value / target) * 100 : 0;
        const over = value > target;
        return (
          <>
            <div style={{ fontSize: 13, fontFamily: T.mono, color: T.sub, marginBottom: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: over ? T.red : T.text }}>{fmt(value)}</span>
              {" "}/ {fmt(target)}
            </div>
            <ProgressBar value={pct} color={over ? T.red : T.accent} height={4} />
            <div style={{ fontSize: 11, color: over ? T.red : T.sub, marginTop: 6 }}>
              {over ? `${fmt(value - target)} over` : `${fmt(target - value)} left`} · {describeTile(def)}
            </div>
          </>
        );
      })()}

      {def.type === "trend" && series && (
        <>
          <div style={{ fontSize: 11, color: T.sub, marginBottom: 8 }}>{describeTile(def)}</div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={series} barSize={22} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="label" tick={chart.tick} axisLine={chart.axisLine} tickLine={chart.tickLine} />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                {series.map((entry, i) => (
                  <Cell key={i} fill={i === series.length - 1 ? T.accent : T.chartMuted} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </Card>
  );
}
