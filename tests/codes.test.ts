// What the code screen says about where the code went.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { asSentBy, whereItWent } from '../src/lib/codes.ts';

test('a member is told the channel, the masked number and what to do if nothing comes', () => {
  const text = whereItWent('link_member', 'whatsapp', '+230 5*** *428');
  assert.match(text, /^A code has been sent by WhatsApp to \+230 5\*\*\* \*428\./);
  assert.match(text, /mobile number on record may no longer be yours/);
  assert.match(text, /\+230 5944 9797/);
});

test('a code by email names the address and the spam folder', () => {
  const text = whereItWent('link_member', 'email', 'f***h@example.mu');
  assert.match(text, /by email to f\*\*\*h@example\.mu\./);
  assert.match(text, /spam or junk folder/);
  assert.match(text, /email address on record may no longer be yours/);
});

test('an applicant is told only where it went', () => {
  assert.equal(whereItWent('sign_up', 'whatsapp', '+230 5*** *001'), 'A code has been sent by WhatsApp to +230 5*** *001.');
});

test('a server from before the choice sent every code by SMS', () => {
  assert.equal(asSentBy(''), undefined);
  assert.match(whereItWent('link_member', undefined, null), /by SMS to the mobile number on your membership record/);
});
