import { test } from 'node:test';
import assert from 'node:assert/strict';
import { amountProblem, normaliseAmount, requestTitle, sortRequests, toneFor } from '../src/lib/transact.ts';
import type { MemberRequest } from '../src/api/types.ts';

test('an amount is rupees, at most two decimals, above zero, and within what is available', () => {
  assert.equal(normaliseAmount(' Rs 1,500.50 '), '1500.50');
  assert.equal(amountProblem('1500'), null);
  assert.equal(amountProblem('1,500.5'), null);
  assert.equal(amountProblem(''), 'Enter an amount.');
  assert.match(amountProblem('12.345')!, /in rupees/);
  assert.match(amountProblem('abc')!, /in rupees/);
  assert.equal(amountProblem('0'), 'Enter an amount above zero.');
  assert.equal(amountProblem('500', '500.00'), null);
  assert.equal(amountProblem('500.01', '500.00'), 'That is more than the Rs 500.00 available.');
  // Unknown availability (still loading) is no ceiling: the backend checks.
  assert.equal(amountProblem('999999', null), null);
});

const request = (over: Partial<MemberRequest>): MemberRequest => ({
  id: 'r',
  reference: 'TX-000001',
  kind: 'deposit',
  state: 'pending',
  statusLabel: 'Pending approval',
  stage: null,
  amount: '100.00',
  currency: 'MUR',
  accountId: 'a',
  accountNo: 'MSA-000001',
  accountTypeName: 'MSA',
  counterpartAccountNo: null,
  counterpartAccountTypeName: null,
  methodName: null,
  note: '',
  reason: null,
  createdAt: '2026-10-01T10:00:00.000Z',
  completedAt: null,
  ...over,
});

test('a request is titled by what it does, and toned by where it stands', () => {
  assert.equal(requestTitle(request({ kind: 'deposit' })), 'Deposit to MSA-000001');
  assert.equal(requestTitle(request({ kind: 'withdrawal' })), 'Withdrawal from MSA-000001');
  assert.equal(
    requestTitle(request({ kind: 'transfer', counterpartAccountNo: 'SH-000001' })),
    'Transfer from MSA-000001 to SH-000001'
  );
  assert.equal(toneFor('pending'), 'warning');
  assert.equal(toneFor('approved'), 'info');
  assert.equal(toneFor('completed'), 'success');
  assert.equal(toneFor('declined'), 'danger');
});

test('what is still with the officers comes first, newest first', () => {
  const sorted = sortRequests([
    request({ id: 'old-done', state: 'completed', createdAt: '2026-09-01T00:00:00Z' }),
    request({ id: 'new-done', state: 'declined', createdAt: '2026-10-05T00:00:00Z' }),
    request({ id: 'old-open', state: 'pending', createdAt: '2026-09-20T00:00:00Z' }),
    request({ id: 'new-open', state: 'approved', createdAt: '2026-10-02T00:00:00Z' }),
  ]);
  assert.deepEqual(
    sorted.map(r => r.id),
    ['new-open', 'old-open', 'new-done', 'old-done']
  );
});
