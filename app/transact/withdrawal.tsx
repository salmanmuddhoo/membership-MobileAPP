// Asking for money out of an account — the member's own or a minor's in
// their care — paid by the bank transfer or cheque the member chooses. It
// goes to the Secretary, then the President; once approved the Treasurer
// pays it out that way (migration 0120 on the backend). Nothing leaves the
// account before then.
import React, { useState } from 'react';
import type { PayoutMethod } from '@/api';
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

// What an older backend, which does not list them, still accepts.
const PAYOUT_METHODS: PayoutMethod[] = [
  { code: 'bank_transfer', name: 'Bank transfer' },
  { code: 'cheque', name: 'Cheque' },
];

export default function Withdrawal() {
  const reference = useReference();
  const accounts = useMoneyAccounts();
  const withdrawal = useWithdrawal();
  const key = useIdempotencyKey();
  const sent = useSent();

  const [accountId, setAccountId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PayoutMethod['code'] | null>(null);
  const [payToBank, setPayToBank] = useState('');
  const [payToAccountNumber, setPayToAccountNumber] = useState('');
  const [note, setNote] = useState('');
  const [problems, setProblems] = useState<Problems>(NO_PROBLEMS);
  const balance = useAccountBalance(accountId);

  if (reference.isLoading || accounts.isLoading) return <Loading />;
  if (!reference.data?.enabledOperations?.includes('withdrawal')) {
    return <Empty title="Not available yet">Withdrawals from the app have not been switched on. Visit a branch.</Empty>;
  }

  const options = accounts.list.filter(a => Number(a.balance ?? '0') > 0);
  const available = balance.data?.available ?? null;
  const payouts = reference.data.withdrawalMethods ?? PAYOUT_METHODS;
  const byTransfer = method === 'bank_transfer';

  async function send() {
    const fields: Record<string, string> = {};
    if (!accountId) fields.accountId = 'Choose the account to withdraw from.';
    const amountError = amountProblem(amount, available);
    if (amountError) fields.amount = amountError;
    if (!method) fields.method = 'Choose how you want to receive it.';
    if (byTransfer && !payToBank.trim()) fields.payToBank = 'Enter the name of your bank.';
    if (byTransfer && !/^[A-Za-z0-9 -]{4,40}$/.test(payToAccountNumber.trim())) {
      fields.payToAccountNumber = 'Enter your bank account number.';
    }
    if (Object.keys(fields).length > 0) {
      setProblems({ message: 'Some details need attention.', fields });
      return;
    }
    setProblems(NO_PROBLEMS);
    try {
      await withdrawal.mutateAsync({
        input: {
          accountId: accountId!,
          amount: normaliseAmount(amount),
          method: method!,
          payToBank: byTransfer ? payToBank.trim() : undefined,
          payToAccountNumber: byTransfer ? payToAccountNumber.trim() : undefined,
          reason: note.trim() || undefined,
        },
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
      <OptionField
        label="How you want to receive it"
        required
        value={method}
        options={payouts.map(m => ({
          value: m.code,
          label: m.name,
          detail: m.code === 'bank_transfer' ? 'Into your own bank account' : 'A cheque in your name',
        }))}
        onChange={v => setMethod(v as PayoutMethod['code'])}
        error={problems.fields.method}
      />
      {byTransfer ? (
        <>
          <TextField
            label="Your bank"
            required
            value={payToBank}
            onChangeText={setPayToBank}
            placeholder="e.g. MCB"
            error={problems.fields.payToBank}
          />
          <TextField
            label="Your bank account number"
            required
            value={payToAccountNumber}
            onChangeText={setPayToAccountNumber}
            keyboardType="number-pad"
            error={problems.fields.payToAccountNumber}
          />
        </>
      ) : null}
      <TextField
        label="Note"
        required={false}
        value={note}
        onChangeText={setNote}
        placeholder="Anything the office should know"
        multiline
      />
    </Screen>
  );
}
