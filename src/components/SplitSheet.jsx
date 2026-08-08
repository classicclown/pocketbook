import { useMemo, useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import DetailSheet from "./DetailSheet";
import { splitId } from "../hooks/useSplits";
import { fmt } from "../utils/compute";

// Configure a shared-purchase / reimbursement split for one expense.
//  • "My share"  — you type the portion you actually incurred (cash paybacks
//    where there's no repayment transaction to point at).
//  • "Link repayments" — tick the income transactions that were people paying
//    you back; the expense drops by their total AND they stop counting as
//    income, so neither side is overstated.
// tx is the (possibly already-split) expense; transactions is the full netted
// stream, used to offer repayment candidates.
export default function SplitSheet({ tx, transactions, def, onSave, onRemove, onClose }) {
  const { T } = useTheme();

  const original = tx._split ? tx._split.original : tx.amount;
  const expId = splitId(tx);

  const [mode, setMode] = useState(def?.mode || "links");
  const [myShare, setMyShare] = useState(def?.myShare != null ? String(def.myShare) : "");
  const [links, setLinks] = useState(() => new Set(def?.links || []));

  // Repayment candidates: income transactions (and anything already linked to
  // this expense, which now reads as a Transfer), most recent first.
  const candidates = useMemo(() => {
    return transactions
      .filter((t) => {
        const id = splitId(t);
        if (id === expId) return false;
        return t.category === "Income" || links.has(id);
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, expId, links]);

  const linkedSum = useMemo(() => {
    let s = 0;
    candidates.forEach((t) => { if (links.has(splitId(t))) s += t.amount; });
    return s;
  }, [candidates, links]);

  const effective = mode === "share"
    ? (myShare === "" ? original : Math.max(0, Math.min(Number(myShare) || 0, original)))
    : Math.max(0, original - linkedSum);

  const canSave = mode === "share" ? myShare !== "" : links.size > 0;

  const toggleLink = (id) => {
    setLinks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const save = () => {
    if (mode === "share") onSave({ mode: "share", myShare: Number(myShare) || 0 });
    else onSave({ mode: "links", links: Array.from(links) });
  };

  const label = { display: "block", fontSize: 10, fontWeight: 600, color: T.sub, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 };
  const field = {
    width: "100%", boxSizing: "border-box", fontSize: 14, fontFamily: T.mono,
    color: T.text, background: T.bg, border: `1px solid ${T.border}`,
    borderRadius: T.radiusSm, padding: "9px 11px",
  };

  return (
    <DetailSheet title={tx.vendor} subtitle={`Split · ${tx.date}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Full amount reminder */}
        <div style={{ fontSize: 12, color: T.sub }}>
          Full amount charged:{" "}
          <strong style={{ fontFamily: T.mono, color: T.text }}>{fmt(original)}</strong>
        </div>

        {/* Mode toggle */}
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { v: "links", l: "Link repayments" },
            { v: "share", l: "My share" },
          ].map((o) => {
            const active = mode === o.v;
            return (
              <button key={o.v} onClick={() => setMode(o.v)} style={{
                flex: 1, fontSize: 12, fontWeight: active ? 600 : 400, padding: "8px 10px",
                borderRadius: T.radius, border: `1px solid ${active ? T.accent : T.border}`,
                background: active ? T.accentBg : "transparent", color: active ? T.accent : T.sub,
                cursor: "pointer", fontFamily: T.font,
              }}>{o.l}</button>
            );
          })}
        </div>

        {mode === "share" ? (
          <div>
            <label style={label}>Amount you actually incurred</label>
            <input
              type="number" min="0" max={original} inputMode="decimal"
              value={myShare} onChange={(e) => setMyShare(e.target.value)}
              placeholder={`0 – ${original.toFixed(2)}`} style={field}
            />
            <div style={{ fontSize: 11, color: T.sub, marginTop: 6 }}>
              Use this when someone paid you back in cash — no repayment transaction to point at.
            </div>
          </div>
        ) : (
          <div>
            <label style={label}>Repayments received</label>
            {candidates.length === 0 ? (
              <div style={{ fontSize: 12, color: T.sub, padding: "8px 0" }}>
                No income transactions to link. Once a repayment lands in your account it'll appear here — or use “My share”.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 260, overflowY: "auto" }}>
                {candidates.map((t) => {
                  const id = splitId(t);
                  const on = links.has(id);
                  return (
                    <button key={id} onClick={() => toggleLink(id)} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
                      textAlign: "left", padding: "8px 10px", cursor: "pointer",
                      borderRadius: T.radiusSm, fontFamily: T.font,
                      border: `1px solid ${on ? T.accent : T.border}`,
                      background: on ? T.accentBg : "transparent",
                    }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <span style={{
                          width: 15, height: 15, flexShrink: 0, borderRadius: 3, fontSize: 11, lineHeight: "15px",
                          textAlign: "center", color: "#fff",
                          border: `1px solid ${on ? T.accent : T.border2}`,
                          background: on ? T.accent : "transparent",
                        }}>{on ? "✓" : ""}</span>
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.vendor}</span>
                          <span style={{ fontSize: 10, color: T.sub }}>{t.date}</span>
                        </span>
                      </span>
                      <span style={{ fontSize: 13, fontFamily: T.mono, color: T.green, flexShrink: 0 }}>
                        {fmt(t.amount)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Live preview */}
        <div style={{
          background: T.dim, borderRadius: T.radius, padding: "12px 14px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: 12, color: T.sub }}>Counts as your spend</span>
          <span style={{ fontSize: 18, fontWeight: 700, fontFamily: T.mono, color: T.text }}>
            {fmt(effective)}
          </span>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={save} disabled={!canSave}
            style={{
              flex: 1, fontSize: 13, fontWeight: 600, padding: "10px 18px",
              borderRadius: T.radius, border: "none", fontFamily: T.font,
              background: canSave ? T.accent : T.border,
              color: canSave ? "#fff" : T.sub, cursor: canSave ? "pointer" : "default",
            }}
          >
            {def ? "Update split" : "Save split"}
          </button>
          {def && (
            <button
              onClick={onRemove}
              style={{
                fontSize: 13, fontWeight: 600, padding: "10px 16px",
                borderRadius: T.radius, border: `1px solid ${T.border}`,
                background: "transparent", color: T.red, cursor: "pointer", fontFamily: T.font,
              }}
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </DetailSheet>
  );
}
