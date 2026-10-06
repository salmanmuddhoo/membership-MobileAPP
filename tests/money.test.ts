import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sumMoney } from '../src/lib/money.ts';

test('balances add up in cents, never in floats', () => {
  assert.equal(sumMoney(['0.10', '0.20']), '0.30');
  assert.equal(sumMoney(['1250.00', '750.5', '3']), '2003.50');
  assert.equal(sumMoney([]), '0.00');
  assert.equal(sumMoney(['-20.00', '5.25']), '-14.75');
});

test('an account with no ledger balance yet counts as zero, as the server defines it', () => {
  assert.equal(sumMoney(['100.00', null]), '100.00');
  assert.equal(sumMoney([null, null]), '0.00');
});

test('decimal strings of any shape add up; anything else gives no total', () => {
  assert.equal(sumMoney(['1250', '0.5', '3.250', '1,000.00']), '2253.75');
  assert.equal(sumMoney(['abc']), null);
});
