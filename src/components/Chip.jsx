import { useTheme } from "../theme/ThemeContext";

export default function Chip({ label, active, onClick }) {
  const { T } = useTheme();
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 12, fontWeight: active ? 600 : 400,
        padding: "5px 12px", borderRadius: T.radius,
        border: `1px solid ${active ? T.accent : T.border}`,
        background: active ? T.accentBg : "transparent",
        color: active ? T.accent : T.sub,
        cursor: "pointer", fontFamily: T.font,
      }}
    >
      {label}
    </button>
  );
}
