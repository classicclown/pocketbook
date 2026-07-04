import { useTheme } from "../theme/ThemeContext";
import { fmt } from "../utils/compute";

export default function CustomTooltip({ active, payload, label, currency = "ZAR" }) {
  const { T } = useTheme();
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: T.radiusSm,
      padding: "8px 10px",
      boxShadow: T.shadow,
      fontFamily: T.font,
    }}>
      <div style={{ fontSize: 11, color: T.sub, marginBottom: 4 }}>{label}</div>
      {payload.map((entry, i) => (
        <div key={i} style={{ fontSize: 12, fontWeight: 600, color: entry.color || T.text }}>
          {payload.length > 1 && entry.name && (
            <span style={{ fontWeight: 400, color: T.sub, marginRight: 6 }}>{entry.name}</span>
          )}
          {fmt(entry.value, currency)}
        </div>
      ))}
    </div>
  );
}
