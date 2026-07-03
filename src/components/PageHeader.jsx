import { useTheme } from "../theme/ThemeContext";

export default function PageHeader({ title, eyebrow }) {
  const { T } = useTheme();
  return (
    <div style={{ marginBottom: 24 }}>
      {eyebrow && (
        <div style={{ fontSize: 11, fontWeight: 600, color: T.sub, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>
          {eyebrow}
        </div>
      )}
      <div style={{ fontSize: 28, fontWeight: 700, color: T.text }}>{title}</div>
    </div>
  );
}
