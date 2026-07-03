import { useTheme } from "../theme/ThemeContext";

function ArrowButton({ glyph, title, disabled, onClick }) {
  const { T } = useTheme();
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: 26, height: 22,
        fontSize: 11, lineHeight: 1,
        border: `1px solid ${disabled ? T.border : T.border2}`,
        borderRadius: T.radiusSm,
        background: T.surface,
        color: disabled ? T.border2 : T.text,
        cursor: disabled ? "default" : "pointer",
        fontFamily: T.font,
        padding: 0,
      }}
    >
      {glyph}
    </button>
  );
}

// Wraps an Overview card. In edit mode (desktop only) it shows a control
// strip: ↑/↓ reorder within the column, ◀/▶ move to the other column.
export default function MovableCard({ editing, label, column, canUp, canDown, onUp, onDown, onAcross, children }) {
  const { T } = useTheme();
  if (!editing) return children;

  return (
    <div style={{
      border: `1px dashed ${T.accent}`,
      borderRadius: T.radius,
      padding: 4,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "2px 4px 6px",
      }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: T.accent, textTransform: "uppercase", letterSpacing: 1 }}>
          {label}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {column === "right" && <ArrowButton glyph="◀" title="Move to left column" onClick={onAcross} />}
          <ArrowButton glyph="↑" title="Move up" disabled={!canUp} onClick={onUp} />
          <ArrowButton glyph="↓" title="Move down" disabled={!canDown} onClick={onDown} />
          {column === "left" && <ArrowButton glyph="▶" title="Move to right column" onClick={onAcross} />}
        </div>
      </div>
      {children}
    </div>
  );
}
