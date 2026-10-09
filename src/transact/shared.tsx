// What the three money forms share: the account to choose, the key that
// makes a retry safe, and turning the backend's refusal into words on the
// right field.
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ApiError, type AccountSummary } from '@/api';
import { notify } from '@/lib/dialog';
import { formatMoney } from '@/lib/format';

// One key per form: a second press after a dropped connection is the same
// request, never a second deposit (the backend's Idempotency-Key).
export function useIdempotencyKey(): string {
  const [key] = useState(() => Crypto.randomUUID());
  return key;
}

// Accounts money can move through: open ones only.
export function activeAccounts(accounts: AccountSummary[] | undefined): AccountSummary[] {
  return (accounts ?? []).filter(a => a.status === 'active');
}

export function accountOption(a: AccountSummary) {
  return { value: a.id, label: `${a.typeName} · ${a.accountNo}`, detail: `Balance ${formatMoney(a.balance ?? '0.00')}` };
}

export interface Problems {
  message: string | null;
  fields: Record<string, string>;
}

export const NO_PROBLEMS: Problems = { message: null, fields: {} };

export function problemsFrom(error: unknown): Problems {
  if (error instanceof ApiError) {
    const fields: Record<string, string> = {};
    for (const [key, messages] of Object.entries(error.details)) {
      if (messages[0]) fields[key] = messages[0];
    }
    return {
      message: error.code === 'validation_failed' ? error.message : error.userMessage,
      fields,
    };
  }
  return { message: 'Something went wrong. Please try again.', fields: {} };
}

// After a request is accepted: say what happens next, and go back to the
// list, where it now sits as Pending approval.
export function useSent() {
  const router = useRouter();
  return async (what: string, next: string) => {
    await notify(
      'Sent for approval',
      `Your ${what} is with the Society's officers: ${next} You can follow it under Transact, where it shows as Pending approval until they decide.`
    );
    router.back();
  };
}
