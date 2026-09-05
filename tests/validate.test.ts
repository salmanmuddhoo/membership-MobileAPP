import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MEMBERSHIP_TYPES } from '../src/api/mock/reference.ts';
import {
  errorsFromDetails,
  missingFields,
  subjectsOf,
  validateAll,
  validateField,
} from '../src/forms/validate.ts';

const individual = MEMBERSHIP_TYPES.find(t => t.code === 'individual')!;
const minor = MEMBERSHIP_TYPES.find(t => t.code === 'minor')!;

test('subjects come out in the order the officer form shows them', () => {
  assert.deepEqual(subjectsOf(individual), ['applicant', 'employment', 'nominee']);
  assert.deepEqual(subjectsOf(minor), ['applicant', 'guardian', 'nominee', 'beneficiary']);
});

test('a mandatory field with nothing in it is missing, named by its label', () => {
  const missing = missingFields(individual, [
    { subject: 'applicant', ordinal: 1, values: { surname: 'Peerally', name: '' } },
    { subject: 'nominee', ordinal: 1, values: {} },
  ]);
  const labels = missing.map(m => m.label);
  assert.ok(labels.includes('Name'));
  assert.ok(labels.includes('NIC'));
  assert.ok(labels.includes('Nominee surname'));
  assert.ok(!labels.includes('Surname'));
  // Optional fields are never missing.
  assert.ok(!labels.includes('Email'));
  assert.ok(!labels.includes('Employer name'));
});

test('field validation follows the data type', () => {
  const field = (key: string) => individual.fields.find(f => f.subject === 'applicant' && f.fieldKey === key)!;
  assert.equal(validateField(field('mobile'), '5789 1234'), null);
  assert.match(validateField(field('mobile'), '123')!, /not a number this can place/);
  assert.equal(validateField(field('email'), 'a@b.mu'), null);
  assert.match(validateField(field('email'), 'nope')!, /valid email/);
  assert.equal(validateField(field('gender'), 'Female'), null);
  assert.match(validateField(field('gender'), 'Other')!, /Choose one/);
  // Optional and empty is fine; mandatory and empty is not.
  assert.equal(validateField(field('email'), ''), null);
  assert.equal(validateField(field('surname'), ''), 'Surname is required.');
});

test('validateAll keys problems by subject.ordinal.fieldKey', () => {
  const errors = validateAll(individual, [
    { subject: 'applicant', ordinal: 1, values: { mobile: 'abc' } },
  ]);
  assert.ok('applicant.1.mobile' in errors);
  assert.ok('applicant.1.surname' in errors);
});

test('server details fold into one message per field', () => {
  assert.deepEqual(errorsFromDetails({ 'nominee.1.nic': ['NIC is required.', 'ignored'] }), {
    'nominee.1.nic': 'NIC is required.',
  });
});
