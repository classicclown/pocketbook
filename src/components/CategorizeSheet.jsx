import { useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import DetailSheet from "./DetailSheet";
import { postAction } from "../api/sheet";
import { fmt } from "../utils/compute";

// Suggest a mapping key from the vendor: lowercase, drop store/branch numbers
// and separators so "Woolworths 123 Gardens" suggests "woolworths gardens" →
// user usually trims to "woolworths".
function suggestKey(vendor) {
  return String(vendor || "")
    .toLowerCase()
    .replace(/[*#]|\d+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function TeachForm({ tx, categories, onSaved }) {
  const { T } = useTheme();
  const [key, setKey] = useState(() => suggestKey(tx.vendor));
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [status, setStatus] = useState(null); // null | "saving" | error string

  const canSave = key.trim() && category.trim() && status !== "saving";

  const save = async () => {
    setStatus("saving");
    try {
      await postAction({
        action: "addMapping",
        key: key.trim(),
        category: category.trim(),
        subcategory: subcategory.trim(),
      });
      onSaved();
    } catch (e) {
      setStatus(e.message || "Save failed");
    }
  };

  const inputStyle = {
    fontSize: 13, fontFamily: T.font, color: T.text,
    background: T.bg, border: `1px solid ${T.border}`,
    borderRadius: T.radiusSm, padding: "7px 10px",
    boxSizing: "border-box", width: "100%",
  };

  return (
    <div style={{ background: T.dim, borderRadius: T.radiusSm, padding: 12, marginBottom: 4 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: T.sub, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
        Match text (applies to any vendor containing it)
      </div>
      <input value={key} onChange={e => setKey(e.target.value)} style={{ ...inputStyle, fontFamily: T.mono, marginBottom: 8 }} />
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          value={category}
          onChange={e => setCategory(e.target.value)}
          placeholder="Category"
          list="pb-teach-categories"
          style={inputStyle}
        />
        <input
          value={subcategory}
          onChange={e => setSubcategory(e.target.value)}
          placeholder="Subcategory (optional)"
          style={inputStyle}
        />
      </div>
      <datalist id="pb-teach-categories">
        {categories.map(c => <option key={c} value={c} />)}
      </datalist>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={save}
          disabled={!canSave}
          style={{
            fontSize: 12, fontWeight: 600, padding: "7px 18px",
            borderRadius: T.radius, border: "none", fontFamily: T.font,
            background: canSave ? T.accent : T.border,
            color: canSave ? "#fff" : T.sub,
            cursor: canSave ? "pointer" : "default",
          }}
        >
          {status === "saving" ? "Saving…" : "Save mapping"}
        </button>
        {status && status !== "saving" && (
          <span style={{ fontSize: 11, color: T.red }}>{status}</span>
        )}
      </div>
    </div>
  );
}

// Review flow for uncategorised transactions: pick one, teach the engine a
// mapping; the backend backfills every matching row, then we refetch.
export default function CategorizeSheet({ transactions, categories, initialTx, onSaved, onClose, isMock }) {
  const { T } = useTheme();
  const [selected, setSelected] = useState(initialTx ?? null);

  const keyOf = (tx) => `${tx.date}|${tx.vendor}|${tx.amount}`;
  const isSelected = (tx) => selected && keyOf(selected) === keyOf(tx);

  return (
    <DetailSheet
      title="Uncategorised"
      subtitle={`${transactions.length} transaction${transactions.length === 1 ? "" : "s"} to review`}
      onClose={onClose}
    >
      {isMock && (
        <div style={{ fontSize: 11, color: T.yellow, marginBottom: 12 }}>
          Running on mock data — mappings can't be saved.
        </div>
      )}
      {transactions.map((tx, i) => (
        <div key={i}>
          <div
            onClick={() => setSelected(isSelected(tx) ? null : tx)}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 0", cursor: "pointer", gap: 12,
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {tx.vendor}
              </div>
              <div style={{ fontSize: 11, color: T.sub }}>{tx.date}</div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, fontFamily: T.mono, color: T.text, flexShrink: 0 }}>
              {fmt(tx.amount)}
            </div>
          </div>
          {isSelected(tx) && !isMock && (
            <TeachForm tx={tx} categories={categories} onSaved={onSaved} />
          )}
        </div>
      ))}
    </DetailSheet>
  );
}
