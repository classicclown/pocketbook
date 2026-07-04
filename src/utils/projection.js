// Month-end spend projection: actuals-to-date extrapolated by daily run rate.
// One-off and Holiday tagged transactions, and synthetic fixed expenses,
// count toward actuals but are not extrapolated — a single big purchase (or
// rent) shouldn't inflate the whole month's run rate. Fixed expenses still to
// land this month are added to the projection as known future spend.
import { upcomingFixed } from "./fixed";

const NON_SPEND_CATEGORIES = new Set(["Income", "Transfer"]);
const NON_RECURRING_TAGS = new Set(["One-off", "Holiday"]);

export function isSpend(t) {
  return !NON_SPEND_CATEGORIES.has(t.category) && t.amount > 0;
}

export function projectMonth(transactions, { year, month, today = new Date(), getTag = () => null, fixed = [] }) {
  const ym = `${year}-${String(month).padStart(2, "0")}`;
  const daysInMonth = new Date(year, month, 0).getDate();
  const isCurrent = today.getFullYear() === year && today.getMonth() + 1 === month;
  const elapsedDays = isCurrent ? today.getDate() : daysInMonth;

  let spent = 0, oneOffSpent = 0, recurringSpent = 0;
  const byCategory = {};

  for (const t of transactions) {
    if (t.date.slice(0, 7) !== ym || !isSpend(t)) continue;
    const oneOff = t.fixed || NON_RECURRING_TAGS.has(getTag(t));
    spent += t.amount;
    if (oneOff) oneOffSpent += t.amount;
    else recurringSpent += t.amount;

    const cat = t.category || "Uncategorised";
    if (!byCategory[cat]) byCategory[cat] = { spent: 0, oneOff: 0, recurring: 0, projected: 0 };
    byCategory[cat].spent += t.amount;
    if (oneOff) byCategory[cat].oneOff += t.amount;
    else byCategory[cat].recurring += t.amount;
  }

  const extrapolate = (oneOff, recurring) =>
    isCurrent && elapsedDays > 0 ? oneOff + (recurring * daysInMonth) / elapsedDays : oneOff + recurring;

  // Known future spend: fixed expenses whose day hasn't arrived yet
  const upcoming = isCurrent ? upcomingFixed(fixed, today) : { total: 0, byCategory: {} };

  const projected = extrapolate(oneOffSpent, recurringSpent) + upcoming.total;
  for (const [catName, cat] of Object.entries(byCategory)) {
    cat.projected = extrapolate(cat.oneOff, cat.recurring) + (upcoming.byCategory[catName] || 0);
  }
  // Categories with only upcoming fixed spend (nothing landed yet this month)
  for (const [catName, amount] of Object.entries(upcoming.byCategory)) {
    if (!byCategory[catName]) {
      byCategory[catName] = { spent: 0, oneOff: 0, recurring: 0, projected: amount };
    }
  }

  return {
    spent,
    oneOffSpent,
    recurringSpent,
    upcomingFixedTotal: upcoming.total,
    projected,
    byCategory,
    elapsedDays,
    daysInMonth,
    isCurrent,
    lowConfidence: isCurrent && elapsedDays < 3,
  };
}
