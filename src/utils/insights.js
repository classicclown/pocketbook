import { isSpend } from "./projection";
import { MONTH_LABELS } from "./compute";

const ymOf = (t) => t.date.slice(0, 7);

function shiftYM(ym, delta) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const ymLabel = (ym) => MONTH_LABELS[Number(ym.split("-")[1]) - 1];

// Monthly spend totals for transactions matching `match`, over the `count`
// months ending at `endYM` (inclusive). Oldest first, months with no spend = 0.
export function monthlySeries(transactions, match, endYM, count = 6) {
  const series = [];
  for (let i = count - 1; i >= 0; i--) {
    const ym = shiftYM(endYM, -i);
    const total = transactions
      .filter(t => ymOf(t) === ym && isSpend(t) && match(t))
      .reduce((s, t) => s + t.amount, 0);
    series.push({ ym, label: ymLabel(ym), total });
  }
  return series;
}

// Current spend for `ym` vs the average of the 3 full months before it.
export function categoryStats(transactions, category, ym) {
  const match = (t) => t.category === category;
  const series = monthlySeries(transactions, match, ym, 6);
  const current = series[series.length - 1].total;
  const prior3 = series.slice(2, 5); // the 3 months preceding ym
  const avg3 = prior3.reduce((s, m) => s + m.total, 0) / 3;
  const delta = current - avg3;
  return {
    current,
    avg3,
    delta,
    deltaPct: avg3 > 0 ? (delta / avg3) * 100 : null,
    series,
  };
}

export function merchantStats(transactions, vendor, endYM) {
  const match = (t) => t.vendor === vendor;
  const visits = transactions.filter(t => isSpend(t) && match(t));
  const total = visits.reduce((s, t) => s + t.amount, 0);
  const dates = visits.map(t => t.date).sort();
  return {
    total,
    count: visits.length,
    avgPerVisit: visits.length ? total / visits.length : 0,
    firstDate: dates[0] || null,
    lastDate: dates[dates.length - 1] || null,
    category: visits[0]?.category || null,
    series: monthlySeries(transactions, match, endYM, 6),
  };
}

// Per-category spend for a set of months, for side-by-side comparison.
// Returns rows sorted by largest single-month value.
export function compareMonths(transactions, yms) {
  const totals = {};
  transactions.forEach(t => {
    const ym = ymOf(t);
    if (!yms.includes(ym) || !isSpend(t)) return;
    const cat = t.category || "Uncategorised";
    (totals[cat] ||= {})[ym] = ((totals[cat] || {})[ym] || 0) + t.amount;
  });
  return Object.entries(totals)
    .map(([category, byMonth]) => ({
      category,
      values: yms.map(ym => byMonth[ym] || 0),
    }))
    .sort((a, b) => Math.max(...b.values) - Math.max(...a.values));
}

// Categories and vendors ranked by absolute month-over-month spend change.
export function topMovers(transactions, ym, limit = 5) {
  const prevYM = shiftYM(ym, -1);

  const buckets = (keyFn) => {
    const cur = {}, prev = {};
    transactions.forEach(t => {
      if (!isSpend(t)) return;
      const bucket = ymOf(t) === ym ? cur : ymOf(t) === prevYM ? prev : null;
      if (!bucket) return;
      const key = keyFn(t);
      bucket[key] = (bucket[key] || 0) + t.amount;
    });
    return Array.from(new Set([...Object.keys(cur), ...Object.keys(prev)]))
      .map(name => ({
        name,
        current: cur[name] || 0,
        previous: prev[name] || 0,
        delta: (cur[name] || 0) - (prev[name] || 0),
      }))
      .filter(m => Math.abs(m.delta) > 0)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, limit);
  };

  return {
    categories: buckets(t => t.category || "Uncategorised"),
    vendors: buckets(t => t.vendor || "Unknown"),
  };
}
