// The rules the money forms check before anything is sent, and the words
// a request is shown with. Pure, so they are tested on their own
// (tests/transact.test.ts); the backend checks the same again.
import type { MemberOperation, MemberRequest, RequestState } from '../api/types';
import { formatMoney } from './format';

// Rupees, at most two decimals, more than nothing.
const AMOUNT = /^\d{1,12}(\.\d{1,2})?$/;

export function normaliseAmount(text: string): string {
  return text.replace(/[\s,]/g, '').replace(/^Rs\.?/i, '');
}

/**
 * Why this amount cannot be sent, or null when it can. `available` is what
 * the account can draw on, for a withdrawal or a transfer; a deposit has
 * no ceiling here.
 */
export function amountProblem(text: string, available?: string | null): string | null {
  const value = normaliseAmount(text);
  if (value === '') return 'Enter an amount.';
  if (!AMOUNT.test(value)) return 'Enter an amount in rupees, e.g. 1500 or 1500.50.';
  const cents = Math.round(Number(value) * 100);
  if (cents <= 0) return 'Enter an amount above zero.';
  if (available != null && available !== '') {
    const limit = Math.round(Number(available) * 100);
    if (Number.isFinite(limit) && cents > limit) {
      return `That is more than the ${formatMoney(Number(available).toFixed(2))} available.`;
    }
  }
  return null;
}

export type Tone = 'info' | 'success' | 'warning' | 'danger';

export function toneFor(state: RequestState): Tone {
  switch (state) {
    case 'pending':
      return 'warning';
    case 'approved':
      return 'info';
    case 'completed':
      return 'success';
    case 'declined':
    case 'returned':
    case 'cancelled':
      return 'danger';
  }
}

export const OPERATION_WORDS: Record<MemberOperation, string> = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  transfer: 'Transfer',
};

// "Deposit to MSA-000001", "Withdrawal from MSA-000001",
// "Transfer from MSA-000001 to SH-000001".
export function requestTitle(r: Pick<MemberRequest, 'kind' | 'accountNo' | 'counterpartAccountNo'>): string {
  switch (r.kind) {
    case 'deposit':
      return `Deposit to ${r.accountNo}`;
    case 'withdrawal':
      return `Withdrawal from ${r.accountNo}`;
    case 'transfer':
      return r.counterpartAccountNo
        ? `Transfer from ${r.accountNo} to ${r.counterpartAccountNo}`
        : `Transfer from ${r.accountNo}`;
  }
}

// Requests waiting on officers come first, newest first within each group:
// what the member is watching for is at the top.
export function sortRequests(requests: MemberRequest[]): MemberRequest[] {
  const open = (r: MemberRequest) => (r.state === 'pending' || r.state === 'approved' ? 0 : 1);
  return [...requests].sort((a, b) => open(a) - open(b) || b.createdAt.localeCompare(a.createdAt));
}
