// Telling the Society about money already paid in: by bank transfer, Juice
// or a cheque, never cash. Nothing reaches the balance until the accounts
// department has checked it arrived (migration 0120 on the backend).
import React, { useState } from 'react';
import { useAccounts, useDeposit, useReference } from '@/hooks/queries';
import { amountProblem, normaliseAmount } from '@/lib/transact';
import { Banner, Body, Button, Empty, Loading, OptionField, Screen, TextField } from '@/ui';
import {
  accountOption,
  activeAccounts,
  NO_PROBLEMS,
  problemsFrom,
  useIdempotencyKey,
  useSent,
  type Problems,
} from '@/transact/shared';

export default function Deposit() {
  const reference = useReference();
  const accounts = useAccounts();
  const deposit = useDeposit();
  const key = useIdempotencyKey();
  const sent = useSent();

  const [accountId, setAccountId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<string | null>(null);
  const [bankAccountId, setBankAccountId] = useState<string | null>(null);
  const [methodReference, setMethodReference] = useState('');
  const [note, setNote] = useState('');
  const [problems, setProblems] = useState<Problems>(NO_PROBLEMS);

  if (reference.isLoading || accounts.isLoading) return <Loading />;
  if (!reference.data?.enabledOperations?.includes('deposit')) {
    return <Empty title="Not available yet">Deposits from the app have not been switched on. Visit a branch.</Empty>;
  }

  const options = activeAccounts(accounts.data);
  const methods = reference.data.depositMethods ?? [];
  const chosen = methods.find(m => m.code === method) ?? null;
  const banks = reference.data.bankAccounts ?? [];

  async function send() {
    const fields: Record<string, string> = {};
    if (!accountId) fields.accountId = 'Choose the account it is for.';
    const amountError = amountProblem(amount);
    if (amountError) fields.amount = amountError;
    if (!chosen) fields.method = 'Choose how you paid.';
    if (chosen?.touchesBank && !bankAccountId) fields.bankAccountId = "Choose which of the Society's accounts you paid into.";
    if (chosen?.requiresReference && !methodReference.trim()) fields.methodReference = 'Give the reference shown on your transfer or slip.';
    if (Object.keys(fields).length > 0) {
      setProblems({ message: 'Some details need attention.', fields });
      return;
    }
    setProblems(NO_PROBLEMS);
    try {
      await deposit.mutateAsync({
        input: {
          accountId: accountId!,
          amount: normaliseAmount(amount),
          method: chosen!.code,
          methodReference: methodReference.trim() || undefined,
          bankAccountId: chosen!.touchesBank ? bankAccountId! : undefined,
          reason: note.trim() || undefined,
        },
        idempotencyKey: key,
      });
      await sent('deposit', 'the accounts department checks the money reached the Society, then records it.');
    } catch (e) {
      setProblems(problemsFrom(e));
    }
  }

  return (
    <Screen footer={<Button title="Send for approval" onPress={send} loading={deposit.isPending} />}>
      <Banner tone="info" title="Pay first, then tell us here">
        {
          "Make the payment by bank transfer, Juice or cheque to one of the Society's accounts. The accounts department checks it arrived before it reaches your balance. Cash is paid in at a branch."
        }
      </Banner>
      {problems.message ? <Banner tone="danger">{problems.message}</Banner> : null}
      <OptionField
        label="Into which account"
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
        placeholder="e.g. 1500"
        error={problems.fields.amount}
      />
      <OptionField
        label="How you paid"
        required
        value={method}
        options={methods.map(m => ({ value: m.code, label: m.name }))}
        onChange={setMethod}
        error={problems.fields.method}
      />
      {chosen?.touchesBank ? (
        <OptionField
          label="The Society's account you paid into"
          required
          value={bankAccountId}
          options={banks.map(b => ({ value: b.id, label: b.name, detail: b.bankName }))}
          onChange={setBankAccountId}
          error={problems.fields.bankAccountId}
        />
      ) : null}
      {chosen?.requiresReference ? (
        <TextField
          label="Reference"
          required
          value={methodReference}
          onChangeText={setMethodReference}
          autoCapitalize="characters"
          placeholder="As shown on your transfer or slip"
          error={problems.fields.methodReference}
        />
      ) : null}
      <TextField
        label="Note"
        required={false}
        value={note}
        onChangeText={setNote}
        placeholder="Anything the office should know"
        multiline
      />
      {methods.length === 0 ? <Body muted>No payment method is offered for the app yet. Visit a branch.</Body> : null}
    </Screen>
  );
}
