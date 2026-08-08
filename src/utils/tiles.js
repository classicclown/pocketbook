import { filterByMonth, MONTH_LABELS } from "./compute";
import { isSpend } from "./projection";

// Custom-tile definition:
// { id, title, type: "number"|"progress"|"trend",
//   source: { kind, value }, timeframe, target?, compare?, size? }
//
// source.kind ∈ category | vendor | tag | expenses | income | savings
// timeframe  ∈ thisMonth | lastMonth | avg3 | ytd | all   (number/progress)
// compare    ∈ none | lastMonth | avg3 | target            (number)

export const SOURCE_KINDS = [
  { kind: "category", label: "Category",     needsValue: true },
  { kind: "vendor",   label: "Vendor",       needsValue: true },
  { kind: "tag",      label: "Tag",          needsValue: true },
  { kind: "expenses", label: "All expenses", needsValue: false },
  { kind: "income",   label: "Income",       needsValue: false },
  { kind: "savings",  label: "Savings",      needsValue: false },
];

export const TIMEFRAMES = [
  { value: "thisMonth", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "avg3",      label: "3-month average" },
  { value: "ytd",       label: "Year to date" },
  { value: "all",       label: "All time" },
];

function matchTx(source, t, getTag) {
  switch (source.kind) {
    case "category": return t.category === source.value && isSpend(t);
    case "vendor":   return t.vendor === source.value && isSpend(t);
    case "tag":      return getTag(t) === source.value && isSpend(t);
    case "expenses": return isSpend(t);
    case "income":   return t.category === "Income";
    default:         return false;
  }
}

// Sum the source's amount over a given list of transactions.
function sumOver(source, list, getTag) {
  if (source.kind === "savings") {
    const inc = list.filter(t => t.category === "Income").reduce((s, t) => s + t.amount, 0);
    const exp = list.filter(isSpend).reduce((s, t) => s + t.amount, 0);
    return inc - exp;
  }
  return list.filter(t => matchTx(source, t, getTag)).reduce((s, t) => s + t.amount, 0);
}

function monthList(transactions, now, back) {
  const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
  return filterByMonth(transactions, d.getFullYear(), d.getMonth() + 1);
}

// The tile's primary value for a timeframe.
export function tileValue(def, transactions, getTag, now = new Date()) {
  const { source, timeframe } = def;
  if (timeframe === "avg3") {
    let sum = 0;
    for (let i = 1; i <= 3; i++) sum += sumOver(source, monthList(transactions, now, i), getTag);
    return sum / 3;
  }
  let list;
  if (timeframe === "thisMonth") list = monthList(transactions, now, 0);
  else if (timeframe === "lastMonth") list = monthList(transactions, now, 1);
  else if (timeframe === "ytd") list = transactions.filter(t => t.date.slice(0, 4) === String(now.getFullYear()));
  else list = transactions; // all
  return sumOver(source, list, getTag);
}

// The comparison baseline for a number tile (or null).
export function tileCompare(def, transactions, getTag, now = new Date()) {
  if (!def.compare || def.compare === "none") return null;
  if (def.compare === "target") return Number(def.target) || 0;
  if (def.compare === "lastMonth") return sumOver(def.source, monthList(transactions, now, 1), getTag);
  if (def.compare === "avg3") {
    let sum = 0;
    for (let i = 1; i <= 3; i++) sum += sumOver(def.source, monthList(transactions, now, i), getTag);
    return sum / 3;
  }
  return null;
}

// Monthly series for a trend tile (oldest → newest).
export function tileSeries(def, transactions, getTag, now = new Date(), months = 6) {
  const out = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      label: MONTH_LABELS[d.getMonth()],
      value: sumOver(def.source, monthList(transactions, now, i), getTag),
    });
  }
  return out;
}

// Human-readable subtitle, e.g. "Dining · this month".
export function describeTile(def) {
  const src = def.source.kind === "savings" ? "Savings"
    : def.source.kind === "income" ? "Income"
    : def.source.kind === "expenses" ? "All expenses"
    : def.source.value || def.source.kind;
  const tf = TIMEFRAMES.find(t => t.value === def.timeframe)?.label || "";
  return `${src} · ${tf}`;
}
