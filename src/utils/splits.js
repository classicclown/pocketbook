import { splitId } from "../hooks/useSplits";

// Apply the device-local split overlay to the raw transaction stream, returning
// a NEW array (originals untouched). Two effects, so that both sides of a group
// purchase net out and no figure is overstated:
//   • a split expense's amount drops to the share you actually incurred; and
//   • any repayment income linked to it is retagged "Transfer", so it stops
//     counting as income (every income sum keys off category === "Income") and
//     never becomes spend (isSpend excludes Transfer).
// Split expenses carry _split for display; retagged repayments carry
// _reimbursement so the row can label them instead of showing phantom income.
export function applySplits(transactions, splits) {
  if (!splits || Object.keys(splits).length === 0) return transactions;

  const out = transactions.map((t) => ({ ...t }));
  const byId = new Map();
  out.forEach((t) => byId.set(splitId(t), t));

  for (const [expId, def] of Object.entries(splits)) {
    const exp = byId.get(expId);
    if (!exp || !def) continue;

    const original = exp.amount;
    let effective = original;

    if (def.mode === "share") {
      const share = Number(def.myShare);
      effective = Number.isFinite(share) ? Math.max(0, Math.min(share, original)) : original;
    } else if (def.mode === "links") {
      let linkedSum = 0;
      (def.links || []).forEach((lid) => {
        const inc = byId.get(lid);
        if (!inc) return;
        linkedSum += inc.amount;
        inc.category = "Transfer";
        inc._reimbursement = { expenseId: expId, amount: inc.amount };
      });
      effective = Math.max(0, original - linkedSum);
    }

    const ratio = original > 0 ? effective / original : 1;
    exp._split = { original, effective, mode: def.mode };
    exp.amount = effective;
    if (exp.originalAmount != null) exp.originalAmount = exp.originalAmount * ratio;
  }

  return out;
}
