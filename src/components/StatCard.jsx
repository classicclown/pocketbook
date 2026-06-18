import { T } from "../tokens";

export default function StatCard({ label, value, subValue, subColor }) {
  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: T.radius,
      padding: "12px 14px",
      flex: 1,
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: T.sub, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: T.mono, color: T.text, lineHeight: 1.2 }}>
        {value}
      </div>
      {subValue && (
        <div style={{ fontSize: 11, color: subColor || T.sub, marginTop: 4 }}>
          {subValue}
        </div>
      )}
    </div>
  );
}
