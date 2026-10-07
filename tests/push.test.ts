import { test } from 'node:test';
import assert from 'node:assert/strict';
import { screenFor, staleKeysFor } from '../src/lib/push.ts';

test('money events open the accounts; news opens home; the unknown opens home', () => {
  assert.equal(screenFor({ event: 'deposit.posted' }), '/(member)/accounts');
  assert.equal(screenFor({ event: 'withdrawal.disbursed' }), '/(member)/accounts');
  assert.equal(screenFor({ event: 'transfer.posted' }), '/(member)/accounts');
  assert.equal(screenFor({ event: 'partner.added' }), '/(member)/home');
  assert.equal(screenFor({ event: 'promotion.published' }), '/(member)/home');
  assert.equal(screenFor({ event: 'something.new' }), '/(member)/home');
  assert.equal(screenFor(undefined), '/(member)/home');
  assert.equal(screenFor({}), '/(member)/home');
});

test('a notification says which cached data to refetch', () => {
  assert.deepEqual(staleKeysFor({ event: 'deposit.posted' }), [['accounts'], ['dependents']]);
  assert.deepEqual(staleKeysFor({ event: 'partner.added' }), [['outlets']]);
  assert.deepEqual(staleKeysFor({ event: 'promotion.published' }), [['promotions']]);
  assert.deepEqual(staleKeysFor({ event: 'unknown' }), []);
  assert.deepEqual(staleKeysFor(null), []);
});
