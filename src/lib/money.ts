// The one piece of arithmetic the app does on money: adding balances up for
// the total on the home screen. Decimal strings in, a decimal string out,
// through integer cents — never a float.
export function sumMoney(amounts: readonly (string | null)[]): string | null {
  let cents = 0;
  for (const amount of amounts) {
    // One balance the ledger cannot state makes the total unstatable too;
    // a wrong total is worse than none.
    if (amount === null) return null;
    const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(amount.trim());
    if (!match) return null;
    const [, sign, whole, fraction = ''] = match;
    const value = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    cents += sign === '-' ? -value : value;
  }
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}
