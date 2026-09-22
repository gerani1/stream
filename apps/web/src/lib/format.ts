/** Micro-units to a human figure. Amounts are strings end to end; never floats. */
export function formatAmount(micro: string, decimals = 6): string {
  const v = BigInt(micro || '0');
  const base = 10n ** BigInt(decimals);
  const whole = v / base;
  const frac = (v % base).toString().padStart(decimals, '0').slice(0, 2);
  return `${whole.toLocaleString()}.${frac}`;
}

export function formatDuration(seconds: number | null): string {
  if (!seconds) return '—';
  const days = Math.round(seconds / 86_400);
  if (days % 7 === 0 && days >= 7) {
    const weeks = days / 7;
    return `${weeks} week${weeks === 1 ? '' : 's'}`;
  }
  return `${days} day${days === 1 ? '' : 's'}`;
}

export const tokenLabel = (kind: string) =>
  kind === 'stx' ? 'STX' : kind === 'sbtc' ? 'sBTC' : 'Token';
