import { useTheme } from "../theme/ThemeContext";

export default function SectionHeader({ children, right, style }) {
  const { T } = useTheme();
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      marginBottom: 12, ...style,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: T.sub, textTransform: "uppercase", letterSpacing: 1.5 }}>
        {children}
      </div>
      {right && <div style={{ fontSize: 10, color: T.sub }}>{right}</div>}
    </div>
  );
}
