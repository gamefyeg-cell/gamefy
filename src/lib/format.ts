/// Snap a money value to whole cents. Float arithmetic (esp. percent
/// discounts like price * 10 / 100) leaves tails such as 2006.6939999998;
/// round every unit price, discount, line total and grand total through
/// this so the order summary always equals the sum of the line prices the
/// buyer actually sees.
export function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback for currency codes Intl doesn't recognize (rare regional codes).
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(d);
}
