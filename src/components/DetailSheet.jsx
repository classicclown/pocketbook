import { useTheme } from "../theme/ThemeContext";
import { useIsMobile } from "../hooks/useMediaQuery";

// Drill-down container: slide-up sheet on mobile, right-hand panel on desktop.
export default function DetailSheet({ title, subtitle, onClose, children }) {
  const { T } = useTheme();
  const isMobile = useIsMobile();

  const panelStyle = isMobile
    ? {
        position: "fixed", left: 0, right: 0, bottom: 0,
        maxHeight: "80vh", borderRadius: `${T.radius * 2}px ${T.radius * 2}px 0 0`,
        borderTop: `1px solid ${T.border}`,
      }
    : {
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: 400, borderLeft: `1px solid ${T.border}`,
      };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.35)",
        }}
      />
      <div style={{
        ...panelStyle,
        zIndex: 201,
        background: T.surface,
        boxShadow: T.shadow,
        overflowY: "auto",
        fontFamily: T.font,
        boxSizing: "border-box",
        padding: 20,
        paddingBottom: isMobile ? "calc(20px + env(safe-area-inset-bottom))" : 20,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {title}
            </div>
            {subtitle && <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: `1px solid ${T.border}`, borderRadius: T.radius,
              color: T.sub, cursor: "pointer", fontSize: 12, padding: "4px 10px",
              fontFamily: T.font, flexShrink: 0, marginLeft: 12,
            }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
