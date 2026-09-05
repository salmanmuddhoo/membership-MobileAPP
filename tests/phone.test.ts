import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toInternational, forDisplay, PhoneFormatError } from '../src/lib/phone.ts';

test('a Mauritian mobile typed locally becomes +230', () => {
  assert.equal(toInternational('5789 1234'), '+23057891234');
  assert.equal(toInternational('57891234'), '+23057891234');
  assert.equal(toInternational('230 5789 1234'), '+23057891234');
  assert.equal(toInternational('00230 5789 1234'), '+23057891234');
});

test('a full international number is kept as typed', () => {
  assert.equal(toInternational('+44 7700 900123'), '+447700900123');
});

test('anything ambiguous is refused, not guessed', () => {
  assert.throws(() => toInternational(''), PhoneFormatError);
  assert.throws(() => toInternational('12345'), PhoneFormatError);
  assert.throws(() => toInternational('5789 12ab'), PhoneFormatError);
  assert.throws(() => toInternational('+1'), PhoneFormatError);
});

test('display form groups a Mauritian number', () => {
  assert.equal(forDisplay('+23057891234'), '+230 5789 1234');
  assert.equal(forDisplay('+447700900123'), '+447700900123');
});
