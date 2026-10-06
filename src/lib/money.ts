// The one piece of arithmetic the app does on money: adding balances up for
// the total on the home screen. Decimal strings in, a decimal string out,
// through integer cents — never a float.
export function sumMoney(amounts: readonly (string | null)[]): string | null {
  let cents = 0;
  for (const amount of amounts) {
    // The server sends null for an account with no ledger balance yet,
    // which it defines as the same as zero (member/profile.ts).
    if (amount === null) continue;
    const match = /^(-?)(\d+)(?:\.(\d*))?$/.exec(amount.trim().replace(/,/g, ''));
    // A string that is not a decimal cannot be added; better no total
    // than a wrong one.
    if (!match) return null;
    const [, sign, whole, fraction = ''] = match;
    const value = Number(whole) * 100 + Number(fraction.padEnd(2, '0').slice(0, 2));
    cents += sign === '-' ? -value : value;
  }
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}
