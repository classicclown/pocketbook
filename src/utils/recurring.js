import { isSpend } from "./projection";

// Heuristic subscription/bill detection: a vendor is "recurring" when it has
// enough charges at roughly monthly intervals with similar amounts. False
// positives are expected — the localStorage override list is the escape hatch.
const OVERRIDES_KEY = "pb:recurringOverrides";
const DAY = 86400000;

export function getRecurringOverrides() {
  try {
    const o = JSON.parse(localStorage.getItem(OVERRIDES_KEY));
    return { exclude: Array.isArray(o?.exclude) ? o.exclude : [] };
  } catch {
    return { exclude: [] };
  }
}

export function excludeRecurringVendor(vendor) {
  const o = getRecurringOverrides();
  if (!o.exclude.includes(vendor)) {
    o.exclude.push(vendor);
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(o));
  }
}

function median(values) {
  const s = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function detectRecurring(transactions, {
  minOccurrences = 3,
  intervalRange = [24, 38],   // ~monthly
  amountTolerance = 0.15,
} = {}) {
  const { exclude } = getRecurringOverrides();
  const groups = {};
  transactions.forEach(t => {
    if (!isSpend(t)) return;
    (groups[t.vendor] ||= []).push(t);
  });

  const results = [];
  for (const [vendor, txs] of Object.entries(groups)) {
    if (exclude.includes(vendor) || txs.length < minOccurrences) continue;

    const sorted = txs.slice().sort((a, b) => a.date.localeCompare(b.date));
    const times = sorted.map(t => new Date(t.date + "T00:00:00").getTime());
    const intervals = [];
    for (let i = 1; i < times.length; i++) intervals.push((times[i] - times[i - 1]) / DAY);

    const medInterval = median(intervals);
    if (medInterval < intervalRange[0] || medInterval > intervalRange[1]) continue;

    const amounts = sorted.map(t => t.amount);
    const medAmount = median(amounts);
    const similar = amounts.filter(a => Math.abs(a - medAmount) <= medAmount * amountTolerance).length;
    if (similar / amounts.length < 0.66) continue;

    const lastAmount = amounts[amounts.length - 1];
    const prevMedian = median(amounts.slice(0, -1));
    const next = new Date(times[times.length - 1] + Math.round(medInterval) * DAY);

    results.push({
      vendor,
      category: sorted[sorted.length - 1].category,
      avgAmount: medAmount,
      lastAmount,
      occurrences: amounts.length,
      lastDate: sorted[sorted.length - 1].date,
      nextExpectedDate: localYMD(next),
      priceChanged: prevMedian > 0 && (lastAmount - prevMedian) / prevMedian > 0.05,
    });
  }
  return results.sort((a, b) => b.avgAmount - a.avgAmount);
}

// Format a Date as local YYYY-MM-DD (toISOString would shift across the UTC
// boundary and drop end-of-month days in ahead-of-UTC timezones).
function localYMD(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Expected recurring charges still to land between `today` and month-end.
export function upcomingRecurringTotal(recurring, today = new Date()) {
  const todayStr = localYMD(today);
  const endOfMonth = localYMD(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  return recurring
    .filter(r => r.nextExpectedDate >= todayStr && r.nextExpectedDate <= endOfMonth)
    .reduce((s, r) => s + r.avgAmount, 0);
}
