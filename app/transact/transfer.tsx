// Moving money between the member's own accounts. Approved by the
// Secretary and the President before it moves (migration 0120 on the
// backend).
import React, { useState } from 'react';
import { useAccountBalance, useAccounts, useReference, useTransfer } from '@/hooks/queries';
import { formatMoney } from '@/lib/format';
import { amountProblem, normaliseAmount } from '@/lib/transact';
import { Banner, Button, Empty, Loading, OptionField, Screen, TextField } from '@/ui';
import {
  accountOption,
  activeAccounts,
  NO_PROBLEMS,
  problemsFrom,
  useIdempotencyKey,
  useSent,
  type Problems,
} from '@/transact/shared';

export default function Transfer() {
  const reference = useReference();
  const accounts = useAccounts();
  const transfer = useTransfer();
  const key = useIdempotencyKey();
  const sent = useSent();

  const [sourceId, setSourceId] = useState<string | null>(null);
  const [destinationId, setDestinationId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [problems, setProblems] = useState<Problems>(NO_PROBLEMS);
  const balance = useAccountBalance(sourceId);

  if (reference.isLoading || accounts.isLoading) return <Loading />;
  if (!reference.data?.enabledOperations?.includes('transfer')) {
    return <Empty title="Not available yet">Transfers from the app have not been switched on. Visit a branch.</Empty>;
  }

  const open = activeAccounts(accounts.data);
  const sources = open.filter(a => Number(a.balance ?? '0') > 0);
  const destinations = open.filter(a => a.id !== sourceId);
  const available = balance.data?.available ?? null;

  if (open.length < 2) {
    return <Empty title="One account only">A transfer moves money between two of your accounts.</Empty>;
  }

  async function send() {
    const fields: Record<string, string> = {};
    if (!sourceId) fields.sourceAccountId = 'Choose the account the money comes from.';
    if (!destinationId) fields.destinationAccountId = 'Choose the account it goes to.';
    const amountError = amountProblem(amount, available);
    if (amountError) fields.amount = amountError;
    if (Object.keys(fields).length > 0) {
      setProblems({ message: 'Some details need attention.', fields });
      return;
    }
    setProblems(NO_PROBLEMS);
    try {
      await transfer.mutateAsync({
        input: {
          sourceAccountId: sourceId!,
          destinationAccountId: destinationId!,
          amount: normaliseAmount(amount),
          reason: note.trim() || undefined,
        },
        idempotencyKey: key,
      });
      await sent('transfer', 'the Secretary and the President approve it, then it is recorded.');
    } catch (e) {
      setProblems(problemsFrom(e));
    }
  }

  return (
    <Screen footer={<Button title="Send for approval" onPress={send} loading={transfer.isPending} />}>
      <Banner tone="info" title="Approved before it moves">
        Your request goes to the Secretary and the President. The money moves once it is approved.
      </Banner>
      {problems.message ? <Banner tone="danger">{problems.message}</Banner> : null}
      <OptionField
        label="From"
        required
        value={sourceId}
        options={sources.map(accountOption)}
        onChange={id => {
          setSourceId(id);
          if (id === destinationId) setDestinationId(null);
        }}
        error={problems.fields.sourceAccountId}
      />
      <OptionField
        label="To"
        required
        value={destinationId}
        options={destinations.map(accountOption)}
        onChange={setDestinationId}
        error={problems.fields.destinationAccountId}
      />
      <TextField
        label="Amount (Rs)"
        required
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="e.g. 500"
        hint={available !== null ? `${formatMoney(available)} available.` : undefined}
        error={problems.fields.amount}
      />
      <TextField label="Note" required={false} value={note} onChangeText={setNote} multiline />
    </Screen>
  );
}
