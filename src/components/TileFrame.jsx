import { useTheme } from "../theme/ThemeContext";

function IconButton({ glyph, title, disabled, onClick }) {
  const { T } = useTheme();
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        minWidth: 24, height: 22,
        fontSize: 11, lineHeight: 1,
        border: `1px solid ${disabled ? T.border : T.border2}`,
        borderRadius: T.radiusSm,
        background: T.surface,
        color: disabled ? T.border2 : T.text,
        cursor: disabled ? "default" : "pointer",
        fontFamily: T.font,
        padding: "0 5px",
      }}
    >
      {glyph}
    </button>
  );
}

// Edit-mode wrapper around a dashboard tile: reorder, resize, remove (and edit
// for custom tiles). Outside edit mode it renders the tile untouched.
export default function TileFrame({
  editing, label, size, canUp, canDown,
  onUp, onDown, onToggleSize, onRemove, onEdit, children,
}) {
  const { T } = useTheme();
  const isMobile = window.matchMedia("(max-width: 767px)").matches;
  if (!editing) return children;

  return (
    <div style={{
      border: `1px dashed ${T.accent}`,
      borderRadius: T.radius,
      padding: 4,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "2px 4px 6px", gap: 8,
      }}>
        <span style={{
          fontSize: 10, fontWeight: 600, color: T.accent, textTransform: "uppercase",
          letterSpacing: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {label}
        </span>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <IconButton glyph="↑" title="Move up" disabled={!canUp} onClick={onUp} />
          <IconButton glyph="↓" title="Move down" disabled={!canDown} onClick={onDown} />
          {!isMobile && (
            <IconButton
              glyph={size === "full" ? "◨" : "▭"}
              title={size === "full" ? "Make half width" : "Make full width"}
              onClick={onToggleSize}
            />
          )}
          {onEdit && <IconButton glyph="✎" title="Edit tile" onClick={onEdit} />}
          <IconButton glyph="✕" title="Remove tile" onClick={onRemove} />
        </div>
      </div>
      {children}
    </div>
  );
}
