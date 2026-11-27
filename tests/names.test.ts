// What the home screen calls the signed-in person.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { givenNames, initials } from '../src/lib/names.ts';

const profileWith = (values: Record<string, string>) => ({
  parties: [{ subject: 'applicant' as const, ordinal: 1, values }],
});

test('the given names come whole from the Name field', () => {
  const profile = profileWith({ surname: 'Muddhoo', name: 'Muhammud Salman' });
  assert.equal(givenNames(profile, 'Muhammud Salman Muddhoo'), 'Muhammud Salman');
  assert.equal(givenNames(profileWith({ surname: 'Peerally', name: 'Fatimah' }), 'Fatimah Peerally'), 'Fatimah');
});

test('stray spaces in the Name field are tidied', () => {
  assert.equal(givenNames(profileWith({ name: '  Muhammud   Salman ' }), ''), 'Muhammud Salman');
});

test('before the profile loads, the display name less the surname stands in', () => {
  assert.equal(givenNames(null, 'Muhammud Salman Muddhoo'), 'Muhammud Salman');
  assert.equal(givenNames(undefined, 'Fatimah Peerally'), 'Fatimah');
  assert.equal(givenNames(profileWith({ name: '' }), 'Fatimah Peerally'), 'Fatimah');
});

test('a one-word display name is kept whole, and none gives nothing', () => {
  assert.equal(givenNames(null, 'Applicant'), 'Applicant');
  assert.equal(givenNames(null, '   '), '');
});

test('initials are the first given name and the surname', () => {
  assert.equal(initials('Muhammud Salman Muddhoo'), 'MM');
  assert.equal(initials('Fatimah Peerally'), 'FP');
  assert.equal(initials('Applicant'), 'AP');
  assert.equal(initials(''), '');
});
