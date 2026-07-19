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

function TeachForm({ tx, categories, subcategoriesByCategory = {}, onSaved }) {
  const { T } = useTheme();
  const [key, setKey] = useState(() => suggestKey(tx.vendor));
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [status, setStatus] = useState(null); // null | "saving" | error string

  const canSave = key.trim() && category.trim() && status !== "saving";

  const save = async () => {
    setStatus("saving");
    try {
      const res = await postAction({
        action: "addMapping",
        key: key.trim(),
        category: category.trim(),
        subcategory: subcategory.trim(),
      });
      onSaved({ key: key.trim(), updated: res?.updated ?? 0 });
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
      <input
        value={key}
        onChange={e => setKey(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && canSave) save(); }}
        style={{ ...inputStyle, fontFamily: T.mono, marginBottom: 8 }}
      />
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          value={category}
          onChange={e => setCategory(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && canSave) save(); }}
          placeholder="Category"
          list="pb-teach-categories"
          style={inputStyle}
        />
        <input
          value={subcategory}
          onChange={e => setSubcategory(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && canSave) save(); }}
          placeholder="Subcategory (optional)"
          list="pb-teach-subcategories"
          style={inputStyle}
        />
      </div>
      <datalist id="pb-teach-categories">
        {categories.map(c => <option key={c} value={c} />)}
      </datalist>
      {/* Subcategory suggestions narrow to the chosen category's known values */}
      <datalist id="pb-teach-subcategories">
        {(subcategoriesByCategory[category.trim()] ??
          Array.from(new Set(Object.values(subcategoriesByCategory).flat())).sort()
        ).map(s => <option key={s} value={s} />)}
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

// Review flow for uncategorised transactions: teach a mapping for each, then
// the backend backfills every matching row. Saves accumulate locally (matching
// rows drop out of the list as you go) so you can clear a batch in one sitting;
// the page only reloads once, when the sheet is closed.
export default function CategorizeSheet({ transactions, categories, subcategoriesByCategory, initialTx, onSaved, onClose, isMock }) {
  const { T } = useTheme();
  const [remaining, setRemaining] = useState(transactions);
  const [selected, setSelected] = useState(initialTx ?? null);
  const [savedCount, setSavedCount] = useState(0);
  const [appliedCount, setAppliedCount] = useState(0);

  const keyOf = (tx) => `${tx.date}|${tx.vendor}|${tx.amount}`;
  const isSelected = (tx) => selected && keyOf(selected) === keyOf(tx);

  // A saved mapping clears every remaining row its key matches (mirrors the
  // backend's case-insensitive substring backfill), then advances to the next.
  const handleLocalSave = ({ key, updated }) => {
    const k = key.toLowerCase();
    setRemaining(rem => rem.filter(tx => !String(tx.vendor).toLowerCase().includes(k)));
    setSavedCount(c => c + 1);
    setAppliedCount(c => c + (updated || 0));
    setSelected(null);
  };

  // Only reload the app (refetch) if something actually changed.
  const handleClose = () => {
    if (savedCount > 0) onSaved();
    else onClose();
  };

  return (
    <DetailSheet
      title="Uncategorised"
      subtitle={
        savedCount > 0
          ? `${savedCount} mapping${savedCount === 1 ? "" : "s"} saved · ${appliedCount} transaction${appliedCount === 1 ? "" : "s"} categorised · ${remaining.length} left`
          : `${remaining.length} transaction${remaining.length === 1 ? "" : "s"} to review`
      }
      onClose={handleClose}
    >
      {isMock && (
        <div style={{ fontSize: 11, color: T.yellow, marginBottom: 12 }}>
          Running on mock data — mappings can't be saved.
        </div>
      )}

      {savedCount > 0 && (
        <div style={{
          fontSize: 11, color: T.sub, background: T.dim,
          borderRadius: T.radiusSm, padding: "8px 10px", marginBottom: 12,
        }}>
          Changes are staged. Close this panel to refresh the app and pull in the updated categories.
        </div>
      )}

      {remaining.length === 0 ? (
        <div style={{ padding: "16px 0", fontSize: 13, color: T.sub, textAlign: "center" }}>
          {savedCount > 0 ? "All caught up — nothing left to categorise." : "Nothing to review."}
        </div>
      ) : (
        remaining.map((tx, i) => (
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
              <TeachForm
                tx={tx}
                categories={categories}
                subcategoriesByCategory={subcategoriesByCategory}
                onSaved={handleLocalSave}
              />
            )}
          </div>
        ))
      )}
    </DetailSheet>
  );
}
