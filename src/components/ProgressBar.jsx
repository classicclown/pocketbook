import { useTheme } from "../theme/ThemeContext";

export default function ProgressBar({ value, color, trackColor, height = 4, marker }) {
  const { T } = useTheme();
  const pct = Math.min(100, Math.max(0, value));
  const markerPct = marker != null ? Math.min(100, Math.max(0, marker)) : null;
  return (
    <div style={{ background: trackColor ?? T.dim, height, width: "100%", position: "relative" }}>
      <div style={{ width: `${pct}%`, height, background: color ?? T.accent, transition: "width 0.4s ease" }} />
      {markerPct != null && (
        <div style={{
          position: "absolute", left: `${markerPct}%`, top: -3,
          width: 1, height: height + 6, background: T.border2,
        }} />
      )}
    </div>
  );
}
