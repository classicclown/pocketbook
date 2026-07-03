import { useTheme } from "../theme/ThemeContext";

export default function Card({ children, style, accent }) {
  const { T } = useTheme();
  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${accent || T.border}`,
      borderRadius: T.radius,
      padding: 16,
      marginBottom: 12,
      ...style,
    }}>
      {children}
    </div>
  );
}
