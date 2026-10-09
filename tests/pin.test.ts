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
  needsNewPin,
  PIN_LENGTH,
  pinLengthOf,
} from '../src/auth/pin.ts';

const digest = async (text: string) => createHash('sha256').update(text).digest('hex');

test('a PIN is exactly four digits', () => {
  assert.equal(PIN_LENGTH, 4);
  assert.equal(isWellFormedPin('4829'), true);
  assert.equal(isWellFormedPin('482'), false);
  assert.equal(isWellFormedPin('48a9'), false);
  assert.equal(isWellFormedPin('482915'), false);
});

test('the PINs anyone would try first are refused at set-up', () => {
  for (const weak of ['0000', '1111', '1234', '4321', '6789', '9876', '482']) {
    assert.equal(isWeakPin(weak), true, weak);
  }
  for (const fine of ['4829', '1212', '1357', '1122']) {
    assert.equal(isWeakPin(fine), false, fine);
  }
});

test('the record holds a salted digest, never the PIN, and matches only the right one', async () => {
  const record = await createPinRecord('4829', 'salt-a', digest);
  assert.equal(record.length, 4);
  assert.equal(JSON.stringify(record).includes('4829'), false);
  assert.equal(await matchesPin(record, '4829', digest), true);
  assert.equal(await matchesPin(record, '4828', digest), false);
  assert.equal(await matchesPin(record, '482', digest), false);
  // Same PIN, different salt: different bytes on each phone.
  const other = await createPinRecord('4829', 'salt-b', digest);
  assert.notEqual(other.hash, record.hash);
  assert.equal(needsNewPin(record), false);
});

test('a six-digit PIN from before still unlocks, once, and is then replaced', async () => {
  // A record written by an older build: no length, six digits.
  const { length: _, ...legacy } = await createPinRecord('482915', 'salt-old', digest);
  assert.equal(pinLengthOf(legacy), 6);
  assert.equal(needsNewPin(legacy), true);
  assert.equal(await matchesPin(legacy, '482915', digest), true);
  assert.equal(await matchesPin(legacy, '4829', digest), false);
});

test('five wrong PINs are the limit', async () => {
  const record = await createPinRecord('4829', 'salt', digest);
  assert.equal(attemptsLeft(record), MAX_PIN_ATTEMPTS);
  assert.equal(attemptsLeft({ ...record, failures: 4 }), 1);
  assert.equal(attemptsLeft({ ...record, failures: 5 }), 0);
  assert.equal(attemptsLeft({ ...record, failures: 9 }), 0);
});
