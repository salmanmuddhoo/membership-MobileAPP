import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sumMoney } from '../src/lib/money.ts';

test('balances add up in cents, never in floats', () => {
  assert.equal(sumMoney(['0.10', '0.20']), '0.30');
  assert.equal(sumMoney(['1250.00', '750.5', '3']), '2003.50');
  assert.equal(sumMoney([]), '0.00');
  assert.equal(sumMoney(['-20.00', '5.25']), '-14.75');
});

test('a balance the ledger cannot state makes the total unstatable', () => {
  assert.equal(sumMoney(['100.00', null]), null);
  assert.equal(sumMoney(['abc']), null);
});
