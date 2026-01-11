// Small helper for formatting realized P&L consistently across the app
export function formatRealizedEntry(entry: any, opts?: { absolute?: boolean }) {
  const absolute = opts?.absolute ?? false;

  if (entry && entry.result === 'BREAKEVEN') {
    return 'BE ($0.00)';
  }

  const amount = Number(entry?.realized_amount ?? entry?.realized_points ?? 0);
  if (absolute) {
    return `$${Math.abs(amount).toFixed(2)}`;
  }

  const sign = amount > 0 ? '+' : amount < 0 ? '-' : '';
  return `${sign}$${Math.abs(amount).toFixed(2)}`;
}

export function formatRealizedValue(amountInput: any, opts?: { absolute?: boolean }) {
  const absolute = opts?.absolute ?? false;
  const amount = Number(amountInput ?? 0);
  if (absolute) return `$${Math.abs(amount).toFixed(2)}`;
  const sign = amount > 0 ? '+' : amount < 0 ? '-' : '';
  return `${sign}$${Math.abs(amount).toFixed(2)}`;
}
