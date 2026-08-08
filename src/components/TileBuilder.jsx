import { useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import DetailSheet from "./DetailSheet";
import { SOURCE_KINDS, TIMEFRAMES } from "../utils/tiles";

const TYPES = [
  { value: "number",   label: "Number" },
  { value: "progress", label: "Progress" },
  { value: "trend",    label: "Trend" },
];

const COMPARE = [
  { value: "none",      label: "None" },
  { value: "lastMonth", label: "Last month" },
  { value: "avg3",      label: "3-mo avg" },
  { value: "target",    label: "Target" },
];

function Chips({ options, value, onChange }) {
  const { T } = useTheme();
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map(o => {
        const active = o.value === value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)} style={{
            fontSize: 12, fontWeight: active ? 600 : 400, padding: "5px 12px",
            borderRadius: T.radius, border: `1px solid ${active ? T.accent : T.border}`,
            background: active ? T.accentBg : "transparent", color: active ? T.accent : T.sub,
            cursor: "pointer", fontFamily: T.font,
          }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// Create / edit a custom tile. `initial` is a definition when editing.
export default function TileBuilder({ initial, categories, vendors, tags, onSave, onClose }) {
  const { T } = useTheme();
  const [def, setDef] = useState(() => initial || {
    title: "", type: "number",
    source: { kind: "category", value: "" },
    timeframe: "thisMonth", compare: "none", target: "", size: "half",
  });

  const set = (patch) => setDef(d => ({ ...d, ...patch }));
  const setSource = (patch) => setDef(d => ({ ...d, source: { ...d.source, ...patch } }));

  const kindMeta = SOURCE_KINDS.find(k => k.kind === def.source.kind);
  const needsValue = kindMeta?.needsValue;
  const needsTarget = def.type === "progress" || (def.type === "number" && def.compare === "target");
  const valueList = def.source.kind === "vendor" ? vendors
    : def.source.kind === "tag" ? tags : categories;

  const canSave = def.type && def.source.kind &&
    (!needsValue || def.source.value.trim()) &&
    (!needsTarget || Number(def.target) > 0);

  const label = { display: "block", fontSize: 10, fontWeight: 600, color: T.sub, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 };
  const field = {
    width: "100%", boxSizing: "border-box", fontSize: 13, fontFamily: T.font,
    color: T.text, background: T.bg, border: `1px solid ${T.border}`,
    borderRadius: T.radiusSm, padding: "8px 10px",
  };
  return (
    <DetailSheet
      title={initial ? "Edit tile" : "New tile"}
      subtitle="Build a metric from your data"
      onClose={onClose}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={label}>Title (optional)</label>
          <input value={def.title} onChange={e => set({ title: e.target.value })}
            placeholder="e.g. Coffee this month" style={field} />
        </div>

        <div>
          <label style={label}>Type</label>
          <Chips options={TYPES} value={def.type} onChange={v => set({ type: v })} />
        </div>

        <div>
          <label style={label}>Data source</label>
          <select value={def.source.kind} onChange={e => setSource({ kind: e.target.value, value: "" })} style={field}>
            {SOURCE_KINDS.map(k => <option key={k.kind} value={k.kind}>{k.label}</option>)}
          </select>
          {needsValue && (
            <input
              value={def.source.value}
              onChange={e => setSource({ value: e.target.value })}
              placeholder={`Pick a ${def.source.kind}`}
              list="pb-tile-values"
              style={{ ...field, marginTop: 8 }}
            />
          )}
          <datalist id="pb-tile-values">
            {(valueList || []).map(v => <option key={v} value={v} />)}
          </datalist>
        </div>

        {def.type !== "trend" && (
          <div>
            <label style={label}>Timeframe</label>
            <Chips options={TIMEFRAMES} value={def.timeframe} onChange={v => set({ timeframe: v })} />
          </div>
        )}

        {def.type === "number" && (
          <div>
            <label style={label}>Compare to</label>
            <Chips options={COMPARE} value={def.compare} onChange={v => set({ compare: v })} />
          </div>
        )}

        {needsTarget && (
          <div>
            <label style={label}>Target amount</label>
            <input type="number" min="0" value={def.target}
              onChange={e => set({ target: e.target.value })} placeholder="0" style={field} />
          </div>
        )}

        <div>
          <label style={label}>Width</label>
          <Chips
            options={[{ value: "half", label: "Half" }, { value: "full", label: "Full" }]}
            value={def.size || "half"}
            onChange={v => set({ size: v })}
          />
        </div>

        <button
          onClick={() => onSave(def)}
          disabled={!canSave}
          style={{
            fontSize: 13, fontWeight: 600, padding: "9px 18px",
            borderRadius: T.radius, border: "none", fontFamily: T.font,
            background: canSave ? T.accent : T.border,
            color: canSave ? "#fff" : T.sub,
            cursor: canSave ? "pointer" : "default",
          }}
        >
          {initial ? "Save changes" : "Add tile"}
        </button>
      </div>
    </DetailSheet>
  );
}
