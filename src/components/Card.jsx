import { T } from "../tokens";

export default function Card({ children, style, accent }) {
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
