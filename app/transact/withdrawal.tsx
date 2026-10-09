// Asking for money out of an account — the member's own or a minor's in
// their care. It goes to the Secretary, then the President; once approved
// the Treasurer pays it out and decides how (migration 0120 on the
// backend). Nothing leaves the account before then.
import React, { useState } from 'react';
import { useAccountBalance, useReference, useWithdrawal } from '@/hooks/queries';
import { formatMoney } from '@/lib/format';
import { amountProblem, normaliseAmount } from '@/lib/transact';
import { Banner, Button, Empty, Loading, OptionField, Screen, TextField } from '@/ui';
import {
  accountOption,
  NO_PROBLEMS,
  problemsFrom,
  useIdempotencyKey,
  useMoneyAccounts,
  useSent,
  type Problems,
} from '@/transact/shared';

export default function Withdrawal() {
  const reference = useReference();
  const accounts = useMoneyAccounts();
  const withdrawal = useWithdrawal();
  const key = useIdempotencyKey();
  const sent = useSent();

  const [accountId, setAccountId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [problems, setProblems] = useState<Problems>(NO_PROBLEMS);
  const balance = useAccountBalance(accountId);

  if (reference.isLoading || accounts.isLoading) return <Loading />;
  if (!reference.data?.enabledOperations?.includes('withdrawal')) {
    return <Empty title="Not available yet">Withdrawals from the app have not been switched on. Visit a branch.</Empty>;
  }

  const options = accounts.list.filter(a => Number(a.balance ?? '0') > 0);
  const available = balance.data?.available ?? null;

  async function send() {
    const fields: Record<string, string> = {};
    if (!accountId) fields.accountId = 'Choose the account to withdraw from.';
    const amountError = amountProblem(amount, available);
    if (amountError) fields.amount = amountError;
    if (Object.keys(fields).length > 0) {
      setProblems({ message: 'Some details need attention.', fields });
      return;
    }
    setProblems(NO_PROBLEMS);
    try {
      await withdrawal.mutateAsync({
        input: { accountId: accountId!, amount: normaliseAmount(amount), reason: note.trim() || undefined },
        idempotencyKey: key,
      });
      await sent('withdrawal');
    } catch (e) {
      setProblems(problemsFrom(e));
    }
  }

  if (options.length === 0) {
    return <Empty title="Nothing to withdraw">None of your accounts has a balance to draw on.</Empty>;
  }

  return (
    <Screen footer={<Button title="Send for approval" onPress={send} loading={withdrawal.isPending} />}>
      {problems.message ? <Banner tone="danger">{problems.message}</Banner> : null}
      <OptionField
        label="From which account"
        required
        value={accountId}
        options={options.map(accountOption)}
        onChange={setAccountId}
        error={problems.fields.accountId}
      />
      <TextField
        label="Amount (Rs)"
        required
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="e.g. 2000"
        hint={available !== null ? `${formatMoney(available)} available, after anything already on its way out.` : undefined}
        error={problems.fields.amount}
      />
      <TextField
        label="Note"
        required={false}
        value={note}
        onChangeText={setNote}
        placeholder="e.g. how you would like to be paid"
        multiline
      />
    </Screen>
  );
}
