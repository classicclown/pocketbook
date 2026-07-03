// Month-end spend projection: actuals-to-date extrapolated by daily run rate.
// One-off and Holiday tagged transactions count toward actuals but are not
// extrapolated — a single big purchase shouldn't inflate the whole month.
const NON_SPEND_CATEGORIES = new Set(["Income", "Transfer"]);
const NON_RECURRING_TAGS = new Set(["One-off", "Holiday"]);

export function isSpend(t) {
  return !NON_SPEND_CATEGORIES.has(t.category) && t.amount > 0;
}

export function projectMonth(transactions, { year, month, today = new Date(), getTag = () => null }) {
  const ym = `${year}-${String(month).padStart(2, "0")}`;
  const daysInMonth = new Date(year, month, 0).getDate();
  const isCurrent = today.getFullYear() === year && today.getMonth() + 1 === month;
  const elapsedDays = isCurrent ? today.getDate() : daysInMonth;

  let spent = 0, oneOffSpent = 0, recurringSpent = 0;
  const byCategory = {};

  for (const t of transactions) {
    if (t.date.slice(0, 7) !== ym || !isSpend(t)) continue;
    const oneOff = NON_RECURRING_TAGS.has(getTag(t));
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

  const projected = extrapolate(oneOffSpent, recurringSpent);
  for (const cat of Object.values(byCategory)) {
    cat.projected = extrapolate(cat.oneOff, cat.recurring);
  }

  return {
    spent,
    oneOffSpent,
    recurringSpent,
    projected,
    byCategory,
    elapsedDays,
    daysInMonth,
    isCurrent,
    lowConfidence: isCurrent && elapsedDays < 3,
  };
}
