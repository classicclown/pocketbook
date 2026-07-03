import { useState, useEffect, useMemo } from "react";
import { useTheme } from "../theme/ThemeContext";
import Card from "../components/Card";
import PageHeader from "../components/PageHeader";
import SectionHeader from "../components/SectionHeader";
import {
  useTags, DEFAULT_TAG_OPTIONS, getCustomTagOptions, setCustomTagOptions, clearAllTags,
} from "../hooks/useTags";

const THEME_CHOICES = [
  { value: "system", label: "System" },
  { value: "light",  label: "Light" },
  { value: "dark",   label: "Dark" },
];

function Segmented({ options, value, onChange }) {
  const { T } = useTheme();
  return (
    <div style={{ display: "inline-flex", border: `1px solid ${T.border}`, borderRadius: T.radius, overflow: "hidden" }}>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              fontSize: 12, fontWeight: active ? 600 : 400,
              padding: "7px 16px", border: "none", cursor: "pointer",
              background: active ? T.accentBg : "transparent",
              color: active ? T.accent : T.sub,
              fontFamily: T.font,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({ checked, onChange, disabled }) {
  const { T } = useTheme();
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: 40, height: 22, borderRadius: 11, border: "none",
        background: checked ? T.accent : T.border2,
        position: "relative", cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1, padding: 0, transition: "background 0.15s",
      }}
    >
      <span style={{
        position: "absolute", top: 2, left: checked ? 20 : 2,
        width: 18, height: 18, borderRadius: "50%",
        background: "#FFFFFF", transition: "left 0.15s",
      }} />
    </button>
  );
}

function SaveStatus({ status }) {
  const { T } = useTheme();
  if (!status) return null;
  const color = status === "Saved" ? T.green : status === "Saving…" ? T.sub : T.red;
  return <span style={{ fontSize: 11, color }}>{status}</span>;
}

export default function Settings({ transactions, budgets, settings, saveSetting, saveBudgets, isMock }) {
  const { T, preference, setPreference } = useTheme();
  useTags(); // re-render when tag options change

  // ── Budget allocations editor ────────────────────────────────────────────
  const categories = useMemo(() => {
    const seen = new Set(Object.keys(budgets));
    transactions.forEach(t => {
      if (t.category && t.category !== "Income" && t.category !== "Transfer" && t.amount > 0) {
        seen.add(t.category);
      }
    });
    return Array.from(seen).sort();
  }, [budgets, transactions]);

  const [draft, setDraft] = useState({});
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    const next = {};
    categories.forEach(c => { next[c] = budgets[c] != null ? String(budgets[c]) : ""; });
    setDraft(next);
  }, [categories, budgets]);

  const dirty = useMemo(
    () => categories.some(c => {
      const current = budgets[c] != null ? String(budgets[c]) : "";
      return (draft[c] ?? "") !== current;
    }),
    [categories, budgets, draft]
  );

  const [budgetStatus, setBudgetStatus] = useState(null);
  const [envelopeStatus, setEnvelopeStatus] = useState(null);

  const handleSaveBudgets = async () => {
    const next = {};
    categories.forEach(c => {
      const v = parseFloat(draft[c]);
      if (Number.isFinite(v) && v > 0) next[c] = v;
    });
    setBudgetStatus("Saving…");
    try {
      await saveBudgets(next);
      setBudgetStatus("Saved");
      setTimeout(() => setBudgetStatus(null), 2500);
    } catch (e) {
      setBudgetStatus(e.message || "Save failed");
    }
  };

  const handleEnvelopeToggle = async (on) => {
    setEnvelopeStatus("Saving…");
    try {
      await saveSetting("envelopeMode", on);
      setEnvelopeStatus("Saved");
      setTimeout(() => setEnvelopeStatus(null), 2500);
    } catch (e) {
      setEnvelopeStatus(e.message || "Save failed");
    }
  };

  // ── Tag options ──────────────────────────────────────────────────────────
  const customTags = getCustomTagOptions();
  const [newTag, setNewTag] = useState("");

  const addTag = () => {
    const name = newTag.trim();
    if (!name) return;
    const all = [...DEFAULT_TAG_OPTIONS, ...customTags];
    if (!all.some(t => t.toLowerCase() === name.toLowerCase())) {
      setCustomTagOptions([...customTags, name]);
    }
    setNewTag("");
  };

  const inputStyle = {
    fontSize: 13, fontFamily: T.mono, color: T.text,
    background: T.bg, border: `1px solid ${T.border}`,
    borderRadius: T.radiusSm, padding: "6px 10px",
    width: 110, textAlign: "right", boxSizing: "border-box",
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <PageHeader title="Settings" />

      {/* Appearance */}
      <Card>
        <SectionHeader>Appearance</SectionHeader>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, color: T.text }}>Theme</div>
          <Segmented options={THEME_CHOICES} value={preference} onChange={setPreference} />
        </div>
        <div style={{ fontSize: 11, color: T.sub, marginTop: 8 }}>
          System follows your device's light/dark preference.
        </div>
      </Card>

      {/* Budgeting */}
      <Card>
        <SectionHeader right={<SaveStatus status={envelopeStatus} />}>Budgeting</SectionHeader>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 13, color: T.text }}>Envelope budgeting</div>
            <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>
              Show allocated / spent / remaining envelopes per category on the Spending screen.
            </div>
          </div>
          <Toggle checked={settings.envelopeMode} onChange={handleEnvelopeToggle} disabled={isMock} />
        </div>

        <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 12, paddingTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Monthly allocations</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <SaveStatus status={budgetStatus} />
              <button
                onClick={handleSaveBudgets}
                disabled={!dirty || isMock}
                style={{
                  fontSize: 12, fontWeight: 600, padding: "6px 16px",
                  borderRadius: T.radius, border: "none", fontFamily: T.font,
                  background: dirty && !isMock ? T.accent : T.dim,
                  color: dirty && !isMock ? "#fff" : T.sub,
                  cursor: dirty && !isMock ? "pointer" : "default",
                }}
              >
                Save
              </button>
            </div>
          </div>
          {isMock && (
            <div style={{ fontSize: 11, color: T.yellow, marginBottom: 10 }}>
              Running on mock data (VITE_SCRIPT_URL not set) — budget changes can't be saved.
            </div>
          )}
          {categories.map(cat => (
            <div key={cat} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "7px 0", borderBottom: `1px solid ${T.border}`, gap: 12,
            }}>
              <div style={{ fontSize: 13, color: T.text }}>{cat}</div>
              <input
                type="number"
                min="0"
                placeholder="—"
                value={draft[cat] ?? ""}
                disabled={isMock}
                onChange={e => setDraft(d => ({ ...d, [cat]: e.target.value }))}
                style={inputStyle}
              />
            </div>
          ))}
          <div style={{ fontSize: 11, color: T.sub, marginTop: 10 }}>
            Amounts double as budget limits and envelope allocations. Leave blank to untrack a category.
          </div>
        </div>
      </Card>

      {/* Tags */}
      <Card>
        <SectionHeader>Transaction Tags</SectionHeader>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {DEFAULT_TAG_OPTIONS.map(t2 => (
            <span key={t2} style={{
              fontSize: 11, fontWeight: 600, padding: "4px 10px",
              borderRadius: T.radiusSm, border: `1px solid ${T.border}`,
              color: T.sub, background: T.dim,
            }}>
              {t2}
            </span>
          ))}
          {customTags.map(t2 => (
            <span key={t2} style={{
              fontSize: 11, fontWeight: 600, padding: "4px 10px",
              borderRadius: T.radiusSm, border: `1px solid ${T.accent}`,
              color: T.accent, background: T.accentBg,
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              {t2}
              <button
                onClick={() => setCustomTagOptions(customTags.filter(x => x !== t2))}
                title={`Remove ${t2}`}
                style={{ background: "none", border: "none", color: T.accent, cursor: "pointer", padding: 0, fontSize: 12, lineHeight: 1 }}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={newTag}
            onChange={e => setNewTag(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addTag()}
            placeholder="New tag name"
            style={{ ...inputStyle, width: 160, textAlign: "left", fontFamily: T.font }}
          />
          <button
            onClick={addTag}
            style={{
              fontSize: 12, fontWeight: 600, padding: "6px 14px",
              borderRadius: T.radius, border: `1px solid ${T.border}`,
              background: "transparent", color: T.text, cursor: "pointer", fontFamily: T.font,
            }}
          >
            Add
          </button>
        </div>
        <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 14, paddingTop: 12 }}>
          <button
            onClick={() => {
              if (window.confirm("Remove tags from all transactions? This can't be undone.")) clearAllTags();
            }}
            style={{
              fontSize: 12, fontWeight: 600, padding: "6px 14px",
              borderRadius: T.radius, border: `1px solid ${T.red}`,
              background: "transparent", color: T.red, cursor: "pointer", fontFamily: T.font,
            }}
          >
            Clear all transaction tags
          </button>
        </div>
      </Card>
    </div>
  );
}
