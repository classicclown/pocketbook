// Fixed monthly expenses (rent, internet, …) live as a template in the Fixed
// sheet tab and are synthesized into every month — zero monthly input. The
// template's current amounts apply to history too (accepted trade-off).

function localYM(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Day clamped to the month length (rent on the 31st still fires in Feb).
function clampDay(day, year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  return Math.min(Math.max(1, day || 1), daysInMonth);
}

// Synthetic transactions for one month. For the current month only rows
// whose day has passed are generated, so "spent so far" stays truthful;
// the rest is exposed via upcomingFixedTotal for projections.
export function fixedForMonth(fixed, ym, today = new Date()) {
  const [y, m] = ym.split("-").map(Number);
  const isCurrent = ym === localYM(today);
  return fixed
    .filter(f => f.active && f.amount > 0)
    .map(f => ({ ...f, clampedDay: clampDay(f.day, y, m) }))
    .filter(f => !isCurrent || f.clampedDay <= today.getDate())
    .map(f => ({
      date: `${ym}-${String(f.clampedDay).padStart(2, "0")}`,
      vendor: f.name,
      amount: f.amount,
      originalAmount: f.amount,
      currency: "ZAR",
      card: "",
      category: f.category || "Fixed",
      subcategory: f.subcategory || "",
      fixed: true,
    }));
}

// Merge synthetics into the card transaction stream for every month that has
// card history (plus the current month), sorted date-descending.
export function mergeFixed(transactions, fixed, today = new Date()) {
  if (!fixed?.length) return transactions;
  const months = new Set(transactions.map(t => t.date.slice(0, 7)));
  months.add(localYM(today));
  const synthetic = [];
  months.forEach(ym => synthetic.push(...fixedForMonth(fixed, ym, today)));
  return [...transactions, ...synthetic].sort((a, b) => b.date.localeCompare(a.date));
}

// Active fixed expenses still to land this month, total and per category.
export function upcomingFixed(fixed, today = new Date()) {
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  let total = 0;
  const byCategory = {};
  fixed
    .filter(f => f.active && f.amount > 0 && clampDay(f.day, y, m) > today.getDate())
    .forEach(f => {
      total += f.amount;
      const cat = f.category || "Fixed";
      byCategory[cat] = (byCategory[cat] || 0) + f.amount;
    });
  return { total, byCategory };
}
