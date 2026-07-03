import { useTheme } from "../theme/ThemeContext";
import ProgressBar from "./ProgressBar";
import { fmt } from "../utils/compute";

// YNAB-style envelope: allocated / spent / remaining with an over-budget state
// and an optional projected-spend tick. `muted` renders the "Unallocated"
// catch-all for spend in categories without an allocation.
export default function EnvelopeCard({ name, allocated, spent, projected, muted }) {
  const { T } = useTheme();
  const pct = allocated > 0 ? (spent / allocated) * 100 : 0;
  const remaining = allocated - spent;
  const over = allocated > 0 && spent > allocated;
  const warn = !over && pct >= 85;

  const barColor = over ? T.red : warn ? T.yellow : T.accent;
  const marker = !muted && allocated > 0 && projected > spent
    ? (projected / allocated) * 100
    : null;

  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${over ? T.red : T.border}`,
      borderRadius: T.radius,
      padding: "12px 14px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 }}>
        <div style={{
          fontSize: 12, fontWeight: 600, color: muted ? T.sub : T.text,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {name}
        </div>
        {over && (
          <span style={{
            fontSize: 9, fontWeight: 700, color: T.red, background: T.redBg,
            padding: "1px 5px", borderRadius: 2, letterSpacing: 0.5, flexShrink: 0,
          }}>
            OVER by {fmt(spent - allocated)}
          </span>
        )}
      </div>

      {muted ? (
        <div style={{ fontSize: 15, fontWeight: 700, fontFamily: T.mono, color: T.sub, marginBottom: 8 }}>
          {fmt(spent)}
        </div>
      ) : (
        <div style={{ fontSize: 12, fontFamily: T.mono, color: T.sub, marginBottom: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: over ? T.red : T.text }}>{fmt(spent)}</span>
          {" "}/ {fmt(allocated)}
        </div>
      )}

      <ProgressBar value={muted ? 0 : pct} color={barColor} height={4} marker={marker} />

      <div style={{ fontSize: 11, color: over ? T.red : T.sub, marginTop: 6 }}>
        {muted
          ? "No allocation set"
          : over
            ? "Envelope empty"
            : `${fmt(remaining)} left`}
      </div>
    </div>
  );
}
