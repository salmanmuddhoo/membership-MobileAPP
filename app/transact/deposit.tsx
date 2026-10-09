// Telling the Society about money already paid in, by bank transfer or
// Juice — nothing else from the app — into one of the member's accounts or
// a minor's in their care. Nothing reaches the balance until the accounts
// department has checked it arrived (migration 0120 on the backend).
import React, { useState } from 'react';
import { ApiError } from '@/api';
import { useDeposit, useDepositOptions, useReference } from '@/hooks/queries';
import { amountProblem, normaliseAmount } from '@/lib/transact';
import { Banner, Body, Button, Empty, Loading, OptionField, Screen, TextField } from '@/ui';
import {
  accountOption,
  NO_PROBLEMS,
  problemsFrom,
  useIdempotencyKey,
  useMoneyAccounts,
  useSent,
  type Problems,
} from '@/transact/shared';

export default function Deposit() {
  const reference = useReference();
  const accounts = useMoneyAccounts();
  const options = useDepositOptions();
  const deposit = useDeposit();
  const key = useIdempotencyKey();
  const sent = useSent();

  const [accountId, setAccountId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<string | null>(null);
  const [chosenBank, setChosenBank] = useState<string | null>(null);
  const [methodReference, setMethodReference] = useState('');
  const [note, setNote] = useState('');
  const [problems, setProblems] = useState<Problems>(NO_PROBLEMS);

  if (reference.isLoading || accounts.isLoading || options.isLoading) return <Loading />;
  if (!reference.data?.enabledOperations?.includes('deposit')) {
    return <Empty title="Not available yet">Deposits from the app have not been switched on. Visit a branch.</Empty>;
  }
  if (options.error) {
    return (
      <Empty title="Could not load">
        {options.error instanceof ApiError ? options.error.userMessage : 'Please try again in a moment.'}
      </Empty>
    );
  }

  const methods = options.data?.methods ?? [];
  const chosen = methods.find(m => m.code === method) ?? null;
  const banks = options.data?.bankAccounts ?? [];
  // With one account to pay into there is nothing to choose.
  const bankAccountId = chosenBank ?? (banks.length === 1 ? banks[0].id : null);

  async function send() {
    const fields: Record<string, string> = {};
    if (!accountId) fields.accountId = 'Choose the account it is for.';
    const amountError = amountProblem(amount);
    if (amountError) fields.amount = amountError;
    if (!chosen) fields.method = 'Choose how you paid.';
    if (chosen?.touchesBank && !bankAccountId) fields.bankAccountId = "Choose the Society's bank account number you paid into.";
    if (chosen?.requiresReference && !methodReference.trim()) fields.methodReference = 'Enter the reference of your transaction.';
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
      await sent('deposit');
    } catch (e) {
      setProblems(problemsFrom(e));
    }
  }

  return (
    <Screen footer={<Button title="Send for approval" onPress={send} loading={deposit.isPending} />}>
      {problems.message ? <Banner tone="danger">{problems.message}</Banner> : null}
      <OptionField
        label="Into which account"
        required
        value={accountId}
        options={accounts.list.map(accountOption)}
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
          label="Bank account Number of the society"
          required
          value={bankAccountId}
          options={banks.map(b => ({ value: b.id, label: b.accountNumber, detail: b.bankName }))}
          onChange={setChosenBank}
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
          placeholder="Reference of your transaction"
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
