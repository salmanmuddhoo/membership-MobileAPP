// What the three money forms share: the account to choose — the member's
// own or a minor's in their care — the key that makes a retry safe, and
// turning the backend's refusal into words on the right field.
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ApiError } from '@/api';
import { useAccounts, useDependents } from '@/hooks/queries';
import { notify } from '@/lib/dialog';
import { formatMoney } from '@/lib/format';
import { moneyAccounts, type MoneyAccount } from '@/lib/transact';

// One key per form: a second press after a dropped connection is the same
// request, never a second deposit (the backend's Idempotency-Key).
export function useIdempotencyKey(): string {
  const [key] = useState(() => Crypto.randomUUID());
  return key;
}

// The accounts a form offers: the member's own and their minors', open
// ones only, with the hooks' loading state.
export function useMoneyAccounts() {
  const accounts = useAccounts();
  const dependents = useDependents();
  return {
    isLoading: accounts.isLoading || dependents.isLoading,
    list: moneyAccounts(accounts.data, dependents.data),
  };
}

export function accountOption(a: MoneyAccount) {
  const balance = `Balance ${formatMoney(a.balance ?? '0.00')}`;
  return {
    value: a.id,
    label: `${a.typeName} · ${a.accountNo}`,
    detail: a.holderName ? `${a.holderName}, minor in your care · ${balance}` : balance,
  };
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

// After a request is accepted: say so, and go back to the list, where it
// now sits as Pending approval.
export function useSent() {
  const router = useRouter();
  return async (what: string) => {
    await notify('Sent for approval', `Your ${what} is being processed.`);
    router.back();
  };
}
