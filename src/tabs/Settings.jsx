import { useState, useMemo } from "react";
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

function SaveButton({ enabled, onClick }) {
  const { T } = useTheme();
  return (
    <button
      onClick={onClick}
      disabled={!enabled}
      style={{
        fontSize: 12, fontWeight: 600, padding: "6px 16px",
        borderRadius: T.radius, border: "none", fontFamily: T.font,
        background: enabled ? T.accent : T.dim,
        color: enabled ? "#fff" : T.sub,
        cursor: enabled ? "pointer" : "default",
      }}
    >
      Save
    </button>
  );
}

function AddRowButton({ label, onClick }) {
  const { T } = useTheme();
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 12, fontWeight: 600, padding: "6px 14px",
        borderRadius: T.radius, border: `1px dashed ${T.border2}`,
        background: "transparent", color: T.sub, cursor: "pointer", fontFamily: T.font,
      }}
    >
      + {label}
    </button>
  );
}

export default function Settings({
  transactions, budgets, settings, goals, watchlists, fixed,
  saveSetting, saveBudgets, saveGoals, saveWatchlists, saveFixed, isMock,
}) {
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

  // Reset drafts when fresh sheet data arrives (adjust-state-during-render pattern)
  const [draft, setDraft] = useState({});
  const [draftBase, setDraftBase] = useState(null);
  if (draftBase !== budgets) {
    setDraftBase(budgets);
    const next = {};
    categories.forEach(c => { next[c] = budgets[c] != null ? String(budgets[c]) : ""; });
    setDraft(next);
  }

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

  // ── Goals editor ─────────────────────────────────────────────────────────
  const [goalDraft, setGoalDraft] = useState([]);
  const [goalBase, setGoalBase] = useState(null);
  if (goalBase !== goals) {
    setGoalBase(goals);
    setGoalDraft(goals.map(g => ({ ...g })));
  }
  const goalsDirty = JSON.stringify(goalDraft) !== JSON.stringify(goals);
  const [goalStatus, setGoalStatus] = useState(null);

  const handleSaveGoals = async () => {
    const cleaned = goalDraft
      .filter(g => g.name.trim())
      .map(g => ({ ...g, name: g.name.trim(), target: parseFloat(g.target) || 0, saved: parseFloat(g.saved) || 0 }));
    setGoalStatus("Saving…");
    try {
      await saveGoals(cleaned);
      setGoalStatus("Saved");
      setTimeout(() => setGoalStatus(null), 2500);
    } catch (e) {
      setGoalStatus(e.message || "Save failed");
    }
  };

  // ── Watchlists editor ────────────────────────────────────────────────────
  const [watchDraft, setWatchDraft] = useState([]);
  const [watchBase, setWatchBase] = useState(null);
  if (watchBase !== watchlists) {
    setWatchBase(watchlists);
    setWatchDraft(watchlists.map(w => ({ ...w })));
  }
  const watchDirty = JSON.stringify(watchDraft) !== JSON.stringify(watchlists);
  const [watchStatus, setWatchStatus] = useState(null);

  const vendors = useMemo(
    () => Array.from(new Set(transactions.map(t => t.vendor).filter(Boolean))).sort(),
    [transactions]
  );

  const handleSaveWatchlists = async () => {
    const cleaned = watchDraft
      .filter(w => w.name.trim() && w.match.trim())
      .map(w => ({ ...w, name: w.name.trim(), match: w.match.trim(), monthlyLimit: parseFloat(w.monthlyLimit) || 0 }));
    setWatchStatus("Saving…");
    try {
      await saveWatchlists(cleaned);
      setWatchStatus("Saved");
      setTimeout(() => setWatchStatus(null), 2500);
    } catch (e) {
      setWatchStatus(e.message || "Save failed");
    }
  };

  // ── Fixed expenses editor ────────────────────────────────────────────────
  const [fixedDraft, setFixedDraft] = useState([]);
  const [fixedBase, setFixedBase] = useState(null);
  if (fixedBase !== fixed) {
    setFixedBase(fixed);
    setFixedDraft(fixed.map(f => ({ ...f })));
  }
  const fixedDirty = JSON.stringify(fixedDraft) !== JSON.stringify(fixed);
  const [fixedStatus, setFixedStatus] = useState(null);

  const handleSaveFixed = async () => {
    const cleaned = fixedDraft
      .filter(f => f.name.trim())
      .map(f => ({
        ...f,
        name: f.name.trim(),
        amount: parseFloat(f.amount) || 0,
        day: Math.min(31, Math.max(1, parseInt(f.day, 10) || 1)),
      }));
    setFixedStatus("Saving…");
    try {
      await saveFixed(cleaned);
      setFixedStatus("Saved");
      setTimeout(() => setFixedStatus(null), 2500);
    } catch (e) {
      setFixedStatus(e.message || "Save failed");
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
              <SaveButton enabled={dirty && !isMock} onClick={handleSaveBudgets} />
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

      {/* Goals */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <SectionHeader style={{ marginBottom: 0 }}>Savings Goals</SectionHeader>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <SaveStatus status={goalStatus} />
            <SaveButton enabled={goalsDirty && !isMock} onClick={handleSaveGoals} />
          </div>
        </div>
        {goalDraft.map((g, i) => (
          <div key={i} style={{
            display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap",
            padding: "8px 0", borderBottom: `1px solid ${T.border}`,
          }}>
            <input
              value={g.icon}
              onChange={e => setGoalDraft(d => d.map((x, j) => j === i ? { ...x, icon: e.target.value } : x))}
              disabled={isMock}
              style={{ ...inputStyle, width: 44, textAlign: "center", fontFamily: T.font }}
              title="Icon"
            />
            <input
              value={g.name}
              placeholder="Goal name"
              onChange={e => setGoalDraft(d => d.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
              disabled={isMock}
              style={{ ...inputStyle, flex: 1, minWidth: 120, textAlign: "left", fontFamily: T.font }}
            />
            <input
              type="number" min="0"
              value={g.target}
              placeholder="Target"
              onChange={e => setGoalDraft(d => d.map((x, j) => j === i ? { ...x, target: e.target.value } : x))}
              disabled={isMock}
              style={{ ...inputStyle, width: 90 }}
              title="Target amount"
            />
            <input
              type="number" min="0"
              value={g.saved}
              placeholder="Saved"
              onChange={e => setGoalDraft(d => d.map((x, j) => j === i ? { ...x, saved: e.target.value } : x))}
              disabled={isMock}
              style={{ ...inputStyle, width: 90 }}
              title="Saved so far"
            />
            <input
              value={g.deadline}
              placeholder="Mar 2027"
              onChange={e => setGoalDraft(d => d.map((x, j) => j === i ? { ...x, deadline: e.target.value } : x))}
              disabled={isMock}
              style={{ ...inputStyle, width: 90, fontFamily: T.font }}
              title="Deadline"
            />
            <button
              onClick={() => setGoalDraft(d => d.filter((_, j) => j !== i))}
              disabled={isMock}
              title="Remove goal"
              style={{ background: "none", border: "none", color: T.sub, cursor: "pointer", fontSize: 13, padding: 2 }}
            >
              ✕
            </button>
          </div>
        ))}
        <div style={{ marginTop: 10 }}>
          <AddRowButton
            label="Add goal"
            onClick={() => setGoalDraft(d => [...d, { name: "", target: "", saved: "", deadline: "", icon: "🎯" }])}
          />
        </div>
      </Card>

      {/* Fixed expenses */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <SectionHeader style={{ marginBottom: 0 }}>Fixed Expenses</SectionHeader>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <SaveStatus status={fixedStatus} />
            <SaveButton enabled={fixedDirty && !isMock} onClick={handleSaveFixed} />
          </div>
        </div>
        <div style={{ fontSize: 11, color: T.sub, marginBottom: 10 }}>
          Monthly costs from other accounts (rent, internet, …). Counted in every month's spending
          automatically on their day of the month — no monthly entry needed.
        </div>
        {fixedDraft.map((f, i) => (
          <div key={i} style={{
            display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap",
            padding: "8px 0", borderBottom: `1px solid ${T.border}`,
            opacity: f.active ? 1 : 0.55,
          }}>
            <input
              value={f.name}
              placeholder="Name"
              onChange={e => setFixedDraft(d => d.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
              disabled={isMock}
              style={{ ...inputStyle, flex: 1, minWidth: 110, textAlign: "left", fontFamily: T.font }}
            />
            <input
              type="number" min="0"
              value={f.amount}
              placeholder="Amount"
              onChange={e => setFixedDraft(d => d.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))}
              disabled={isMock}
              style={{ ...inputStyle, width: 90 }}
              title="Monthly amount"
            />
            <input
              value={f.category}
              placeholder="Category"
              list="pb-categories"
              onChange={e => setFixedDraft(d => d.map((x, j) => j === i ? { ...x, category: e.target.value } : x))}
              disabled={isMock}
              style={{ ...inputStyle, width: 110, textAlign: "left", fontFamily: T.font }}
            />
            <input
              value={f.subcategory}
              placeholder="Subcategory"
              onChange={e => setFixedDraft(d => d.map((x, j) => j === i ? { ...x, subcategory: e.target.value } : x))}
              disabled={isMock}
              style={{ ...inputStyle, width: 100, textAlign: "left", fontFamily: T.font }}
            />
            <input
              type="number" min="1" max="31"
              value={f.day}
              onChange={e => setFixedDraft(d => d.map((x, j) => j === i ? { ...x, day: e.target.value } : x))}
              disabled={isMock}
              style={{ ...inputStyle, width: 56 }}
              title="Day of month"
            />
            <Toggle
              checked={f.active}
              onChange={(on) => setFixedDraft(d => d.map((x, j) => j === i ? { ...x, active: on } : x))}
              disabled={isMock}
            />
            <button
              onClick={() => setFixedDraft(d => d.filter((_, j) => j !== i))}
              disabled={isMock}
              title="Remove fixed expense"
              style={{ background: "none", border: "none", color: T.sub, cursor: "pointer", fontSize: 13, padding: 2 }}
            >
              ✕
            </button>
          </div>
        ))}
        <div style={{ marginTop: 10 }}>
          <AddRowButton
            label="Add fixed expense"
            onClick={() => setFixedDraft(d => [...d, { name: "", amount: "", category: "", subcategory: "", day: 1, active: true }])}
          />
        </div>
      </Card>

      {/* Watchlists */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <SectionHeader style={{ marginBottom: 0 }}>Watchlists</SectionHeader>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <SaveStatus status={watchStatus} />
            <SaveButton enabled={watchDirty && !isMock} onClick={handleSaveWatchlists} />
          </div>
        </div>
        <div style={{ fontSize: 11, color: T.sub, marginBottom: 10 }}>
          Watch a vendor or category against its own monthly limit, shown on the Spending screen.
        </div>
        {watchDraft.map((w, i) => (
          <div key={i} style={{
            display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap",
            padding: "8px 0", borderBottom: `1px solid ${T.border}`,
          }}>
            <input
              value={w.name}
              placeholder="Name"
              onChange={e => setWatchDraft(d => d.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
              disabled={isMock}
              style={{ ...inputStyle, flex: 1, minWidth: 100, textAlign: "left", fontFamily: T.font }}
            />
            <select
              value={w.type}
              onChange={e => setWatchDraft(d => d.map((x, j) => j === i ? { ...x, type: e.target.value, match: "" } : x))}
              disabled={isMock}
              style={{ ...inputStyle, width: 100, textAlign: "left", fontFamily: T.font }}
            >
              <option value="category">Category</option>
              <option value="vendor">Vendor</option>
            </select>
            <input
              value={w.match}
              placeholder={w.type === "vendor" ? "Vendor name" : "Category name"}
              list={w.type === "vendor" ? "pb-vendors" : "pb-categories"}
              onChange={e => setWatchDraft(d => d.map((x, j) => j === i ? { ...x, match: e.target.value } : x))}
              disabled={isMock}
              style={{ ...inputStyle, flex: 1, minWidth: 130, textAlign: "left", fontFamily: T.font }}
            />
            <input
              type="number" min="0"
              value={w.monthlyLimit}
              placeholder="Limit"
              onChange={e => setWatchDraft(d => d.map((x, j) => j === i ? { ...x, monthlyLimit: e.target.value } : x))}
              disabled={isMock}
              style={{ ...inputStyle, width: 90 }}
              title="Monthly limit"
            />
            <button
              onClick={() => setWatchDraft(d => d.filter((_, j) => j !== i))}
              disabled={isMock}
              title="Remove watchlist"
              style={{ background: "none", border: "none", color: T.sub, cursor: "pointer", fontSize: 13, padding: 2 }}
            >
              ✕
            </button>
          </div>
        ))}
        <datalist id="pb-vendors">
          {vendors.map(v => <option key={v} value={v} />)}
        </datalist>
        <datalist id="pb-categories">
          {categories.map(c => <option key={c} value={c} />)}
        </datalist>
        <div style={{ marginTop: 10 }}>
          <AddRowButton
            label="Add watchlist"
            onClick={() => setWatchDraft(d => [...d, { name: "", type: "category", match: "", monthlyLimit: "" }])}
          />
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
