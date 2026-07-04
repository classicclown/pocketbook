import { useMemo } from "react";
import { useTheme } from "../theme/ThemeContext";
import { useIsMobile } from "../hooks/useMediaQuery";
import Card from "../components/Card";
import PageHeader from "../components/PageHeader";
import SectionHeader from "../components/SectionHeader";
import { fmt } from "../utils/compute";

export default function Investments({ investments = [] }) {
  const { T } = useTheme();
  const isMobile = useIsMobile();

  const holdings = useMemo(
    () => investments.slice().sort((a, b) => b.value - a.value),
    [investments]
  );
  const total = useMemo(() => holdings.reduce((s, h) => s + h.value, 0), [holdings]);

  return (
    <div>
      <PageHeader title="Investments" />

      {/* Total banner */}
      <div style={{
        background: T.heroBg,
        borderRadius: T.radius,
        padding: "20px 24px",
        marginBottom: 12,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: T.heroSub, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>
          Portfolio Value
        </div>
        <div style={{ fontSize: 38, fontWeight: 700, fontFamily: T.mono, color: T.heroText, marginBottom: 12, lineHeight: 1 }}>
          {fmt(total)}
        </div>
        <div style={{ fontSize: 11, color: T.heroFaint }}>
          {holdings.length} holding{holdings.length === 1 ? "" : "s"} · counted in net worth
        </div>
      </div>

      {holdings.length === 0 ? (
        <Card>
          <div style={{ fontSize: 12, color: T.sub }}>
            No holdings yet. Add rows to the Investments tab in your Sheet — Ticker, Name, Units,
            Price (GOOGLEFINANCE formula works), Value. Unlisted funds: leave ticker blank and type
            the Value directly.
          </div>
        </Card>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 2fr) minmax(0, 3fr)",
          gap: isMobile ? 0 : 16,
          alignItems: "start",
        }}>
          {/* Allocation */}
          <Card style={{ marginBottom: isMobile ? 12 : 0 }}>
            <SectionHeader>Allocation</SectionHeader>
            <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", marginBottom: 14 }}>
              {holdings.map((h, i) => (
                <div
                  key={h.name}
                  title={`${h.name} · ${((h.value / total) * 100).toFixed(1)}%`}
                  style={{
                    width: `${(h.value / total) * 100}%`,
                    background: T.chartSeries[i % T.chartSeries.length],
                  }}
                />
              ))}
            </div>
            {holdings.map((h, i) => (
              <div key={h.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.chartSeries[i % T.chartSeries.length], flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: T.text, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {h.name}
                </span>
                <span style={{ fontSize: 11, fontFamily: T.mono, color: T.sub }}>
                  {((h.value / total) * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </Card>

          {/* Holdings */}
          <Card style={{ marginBottom: 0 }}>
            <SectionHeader>Holdings</SectionHeader>
            {holdings.map(h => (
              <div key={h.name} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 0", borderBottom: `1px solid ${T.border}`, gap: 12,
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {h.name}
                    {h.ticker && (
                      <span style={{
                        marginLeft: 6, fontSize: 10, fontWeight: 600, fontFamily: T.mono,
                        color: T.sub, background: T.dim, padding: "1px 5px", borderRadius: 2,
                      }}>{h.ticker}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: T.sub }}>
                    {h.units > 0 && h.price > 0
                      ? `${h.units} × ${fmt(h.price)}`
                      : h.notes || "manual value"}
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: T.mono, color: T.text, flexShrink: 0 }}>
                  {fmt(h.value)}
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
