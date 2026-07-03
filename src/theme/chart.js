import { useTheme } from "./ThemeContext";

// Shared Recharts axis/grid styling so every chart matches.
export function useChartDefaults() {
  const { T } = useTheme();
  return {
    tick: { fontSize: 10, fill: T.sub },
    axisLine: false,
    tickLine: false,
    gridStroke: T.border,
    kFormat: (v) => `${(v / 1000).toFixed(0)}k`,
    series: T.chartSeries,
  };
}
