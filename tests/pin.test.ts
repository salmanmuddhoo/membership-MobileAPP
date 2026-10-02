// The PIN rule, with Node's digest standing in for the device's.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  attemptsLeft,
  createPinRecord,
  isWeakPin,
  isWellFormedPin,
  matchesPin,
  MAX_PIN_ATTEMPTS,
} from '../src/auth/pin.ts';

const digest = async (text: string) => createHash('sha256').update(text).digest('hex');

test('a PIN is exactly six digits', () => {
  assert.equal(isWellFormedPin('482915'), true);
  assert.equal(isWellFormedPin('4829'), false);
  assert.equal(isWellFormedPin('48291a'), false);
  assert.equal(isWellFormedPin('4829155'), false);
});

test('the PINs anyone would try first are refused at set-up', () => {
  for (const weak of ['000000', '111111', '123456', '654321', '456789', '987654']) {
    assert.equal(isWeakPin(weak), true, weak);
  }
  for (const fine of ['482915', '121212', '135790', '112233']) {
    assert.equal(isWeakPin(fine), false, fine);
  }
});

test('the record holds a salted digest, never the PIN, and matches only the right one', async () => {
  const record = await createPinRecord('482915', 'salt-a', digest);
  assert.equal(JSON.stringify(record).includes('482915'), false);
  assert.equal(await matchesPin(record, '482915', digest), true);
  assert.equal(await matchesPin(record, '482916', digest), false);
  assert.equal(await matchesPin(record, '48291', digest), false);
  // Same PIN, different salt: different bytes on each phone.
  const other = await createPinRecord('482915', 'salt-b', digest);
  assert.notEqual(other.hash, record.hash);
});

test('five wrong PINs are the limit', async () => {
  const record = await createPinRecord('482915', 'salt', digest);
  assert.equal(attemptsLeft(record), MAX_PIN_ATTEMPTS);
  assert.equal(attemptsLeft({ ...record, failures: 4 }), 1);
  assert.equal(attemptsLeft({ ...record, failures: 5 }), 0);
  assert.equal(attemptsLeft({ ...record, failures: 9 }), 0);
});
