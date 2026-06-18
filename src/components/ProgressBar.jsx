import { T } from "../tokens";

export default function ProgressBar({ value, color = T.accent, trackColor = T.dim, height = 4 }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div style={{ background: trackColor, height, width: "100%" }}>
      <div style={{ width: `${pct}%`, height, background: color, transition: "width 0.4s ease" }} />
    </div>
  );
}
