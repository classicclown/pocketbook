import { useTheme } from "../theme/ThemeContext";
import { useIsMobile } from "../hooks/useMediaQuery";
import { MONTH_LABELS } from "../utils/compute";

const NAV_ITEMS = [
  { id: "overview",  label: "Overview",  icon: "⬡" },
  { id: "spending",  label: "Spending",  icon: "◫" },
  { id: "analysis",  label: "Analysis",  icon: "◉" },
  { id: "planning",  label: "Planning",  icon: "◎" },
];

const SETTINGS_ITEM = { id: "settings", label: "Settings", icon: "◍" };

const now = new Date();
const currentMonthLabel = `${MONTH_LABELS[now.getMonth()]} ${now.getFullYear()}`;

function SidebarButton({ item, active, onClick }) {
  const { T } = useTheme();
  return (
    <button onClick={onClick} style={{
      width: "100%",
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 12px",
      borderRadius: T.radius,
      border: "none",
      cursor: "pointer",
      background: active ? T.accentBg : "transparent",
      color: active ? T.accent : T.sub,
      fontSize: 13,
      fontWeight: active ? 600 : 400,
      fontFamily: T.font,
      marginBottom: 2,
      textAlign: "left",
      position: "relative",
    }}>
      <span style={{ fontSize: 16 }}>{item.icon}</span>
      {item.label}
      {active && (
        <div style={{
          position: "absolute",
          right: 0,
          top: "50%",
          transform: "translateY(-50%)",
          width: 3,
          height: 16,
          background: T.accent,
          borderRadius: "2px 0 0 2px",
        }} />
      )}
    </button>
  );
}

export default function Layout({ children, activeTab, setActiveTab }) {
  const { T } = useTheme();
  const isMobile = useIsMobile();
  return (
    <div style={{
      display: "flex",
      flexDirection: "row",
      minHeight: "100vh",
      background: T.bg,
      fontFamily: T.font,
    }}>
      {/* Desktop sidebar */}
      {!isMobile && (
        <div style={{
          width: 220,
          background: T.surface,
          borderRight: `1px solid ${T.border}`,
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          top: 0, left: 0, bottom: 0,
          zIndex: 10,
        }}>
          <div style={{ padding: "24px 24px 20px", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.text, letterSpacing: -0.5 }}>Pocketbook</div>
            <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>Personal Finance</div>
          </div>

          <nav style={{ padding: "12px", flex: 1 }}>
            {NAV_ITEMS.map(item => (
              <SidebarButton
                key={item.id}
                item={item}
                active={activeTab === item.id}
                onClick={() => setActiveTab(item.id)}
              />
            ))}
          </nav>

          <div style={{ padding: "12px", borderTop: `1px solid ${T.border}` }}>
            <SidebarButton
              item={SETTINGS_ITEM}
              active={activeTab === SETTINGS_ITEM.id}
              onClick={() => setActiveTab(SETTINGS_ITEM.id)}
            />
          </div>

          <div style={{ padding: "12px 24px 16px" }}>
            <div style={{ fontSize: 10, color: T.sub, textTransform: "uppercase", letterSpacing: 1.5 }}>
              {currentMonthLabel}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main style={{
        flex: 1,
        marginLeft: isMobile ? 0 : 220,
        padding: isMobile ? "20px 16px 88px" : "32px 40px",
        minHeight: "100vh",
        boxSizing: "border-box",
      }}>
        {children}
      </main>

      {/* Mobile bottom nav */}
      {isMobile && (
        <nav style={{
          position: "fixed",
          bottom: 0, left: 0, right: 0,
          background: T.surface,
          borderTop: `1px solid ${T.border}`,
          display: "flex",
          padding: "8px 0 calc(12px + env(safe-area-inset-bottom))",
          zIndex: 100,
        }}>
          {[...NAV_ITEMS, SETTINGS_ITEM].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} style={{
              flex: 1,
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              fontFamily: T.font,
              padding: "4px 0",
            }}>
              <div style={{ width: 24, height: 2, background: activeTab === item.id ? T.accent : "transparent", marginBottom: 2 }} />
              <span style={{ fontSize: 18, opacity: activeTab === item.id ? 1 : 0.3 }}>{item.icon}</span>
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", color: activeTab === item.id ? T.accent : T.sub }}>
                {item.label}
              </span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
