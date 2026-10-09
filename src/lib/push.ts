// What a push notification from the backend carries, and where a tap on it
// should land. The backend puts the event code in the data payload
// (docs/push-notifications.md); the screen is decided here, on the phone,
// so a new event the app does not know still opens the app, on Home.
export type PushData = Record<string, string | undefined>;

export type PushScreen = '/(member)/home' | '/(member)/accounts' | '/(member)/transact' | '/(member)/card';

const SCREENS: Record<string, PushScreen> = {
  // Money moved: the accounts, where the new balance is.
  'deposit.posted': '/(member)/accounts',
  'withdrawal.disbursed': '/(member)/accounts',
  'transfer.posted': '/(member)/accounts',
  'balance.near_floor': '/(member)/accounts',
  // A request on its way, or refused: Transact, where the request and
  // the officer's reason are.
  'withdrawal.submitted': '/(member)/transact',
  'withdrawal.under_review': '/(member)/transact',
  'withdrawal.rejected': '/(member)/transact',
  'deposit.rejected': '/(member)/transact',
  'transfer.rejected': '/(member)/transact',
  // Something new to see: the home page shows both.
  'partner.added': '/(member)/home',
  'promotion.published': '/(member)/home',
};

export function screenFor(data: PushData | null | undefined): PushScreen {
  const event = data?.event ?? '';
  return SCREENS[event] ?? '/(member)/home';
}

// Which server state a notification makes stale, by query key prefix.
export function staleKeysFor(data: PushData | null | undefined): string[][] {
  const event = data?.event ?? '';
  if (event === 'partner.added') return [['outlets']];
  if (event === 'promotion.published') return [['promotions']];
  if (event in SCREENS) return [['accounts'], ['dependents'], ['requests']];
  return [];
}
