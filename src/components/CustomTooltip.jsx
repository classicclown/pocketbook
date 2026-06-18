import { T } from "../tokens";
import { fmt } from "../utils/compute";

export default function CustomTooltip({ active, payload, label, currency = "ZAR" }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: T.radiusSm,
      padding: "8px 10px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      fontFamily: T.font,
    }}>
      <div style={{ fontSize: 11, color: T.sub, marginBottom: 4 }}>{label}</div>
      {payload.map((entry, i) => (
        <div key={i} style={{ fontSize: 12, fontWeight: 600, color: entry.color || T.text }}>
          {fmt(entry.value, currency)}
        </div>
      ))}
    </div>
  );
}
