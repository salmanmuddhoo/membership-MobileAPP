// What the form checks before it lets a submission go, and how a server
// validation_failed is folded back onto the fields it names.
//
// Mandatory-field checking mirrors the web application's capture.ts: a
// mandatory, visible field with nothing in it is missing, named the way the
// form names it. Hidden fields are never required — configuration decides.
import type {
  FieldSubject,
  MembershipType,
  MembershipTypeField,
  PartyValues,
} from '../api/types';
import { toInternational, PhoneFormatError } from '../lib/phone';

export interface MissingField {
  subject: FieldSubject;
  ordinal: number;
  fieldKey: string;
  label: string;
}

export const fieldPath = (subject: FieldSubject, ordinal: number, fieldKey: string) =>
  `${subject}.${ordinal}.${fieldKey}`;

export function visibleFields(
  type: MembershipType,
  subject: FieldSubject
): MembershipTypeField[] {
  return type.fields
    .filter(f => f.subject === subject && f.isVisible)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function subjectsOf(type: MembershipType): FieldSubject[] {
  const seen: FieldSubject[] = [];
  for (const f of type.fields) {
    if (f.isVisible && !seen.includes(f.subject)) seen.push(f.subject);
  }
  // Applicant first, then whatever else the type configures, in the order
  // the officer's form shows them.
  const order: FieldSubject[] = ['applicant', 'employment', 'guardian', 'nominee', 'beneficiary'];
  return order.filter(s => seen.includes(s));
}

export function missingFields(type: MembershipType, parties: PartyValues[]): MissingField[] {
  const missing: MissingField[] = [];
  for (const party of parties) {
    // Only the first nominee has to be complete. A type that configures
    // two or three is offering slots to a family that wants them, not
    // demanding every one be filled — the same rule the server applies in
    // problemsBlockingSubmission (capture.ts). Without it the phone is
    // stricter than the thing it submits to: the button stays disabled
    // over a second nominee the server would never have asked for.
    if (party.subject === 'nominee' && party.ordinal !== 1) continue;
    for (const field of visibleFields(type, party.subject)) {
      if (!field.isMandatory) continue;
      const value = party.values[field.fieldKey];
      if (value === undefined || value.trim() === '') {
        missing.push({
          subject: party.subject,
          ordinal: party.ordinal,
          fieldKey: field.fieldKey,
          label: field.label,
        });
      }
    }
  }
  return missing;
}

// Field-level messages, keyed by fieldPath. Empty means nothing to fix.
export type FieldErrors = Record<string, string>;

export function validateField(field: MembershipTypeField, value: string): string | null {
  const trimmed = (value ?? '').trim();
  if (trimmed === '') {
    return field.isMandatory ? `${field.label} is required.` : null;
  }
  switch (field.dataType) {
    case 'phone':
      try {
        toInternational(trimmed);
        return null;
      } catch (e) {
        return e instanceof PhoneFormatError ? e.message : 'Check this number.';
      }
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? null : 'Enter a valid email address.';
    case 'number':
      return /^\d+(\.\d{1,2})?$/.test(trimmed) ? null : 'Enter a number, e.g. 25000 or 25000.50.';
    case 'date':
      return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) && !Number.isNaN(Date.parse(trimmed))
        ? null
        : 'Enter a date as YYYY-MM-DD.';
    case 'choice':
      return field.choices.includes(trimmed) ? null : `Choose one of: ${field.choices.join(', ')}.`;
    default:
      return null;
  }
}

export function validateParty(
  type: MembershipType,
  party: PartyValues
): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of visibleFields(type, party.subject)) {
    const problem = validateField(field, party.values[field.fieldKey] ?? '');
    if (problem) errors[fieldPath(party.subject, party.ordinal, field.fieldKey)] = problem;
  }
  return errors;
}

export function validateAll(type: MembershipType, parties: PartyValues[]): FieldErrors {
  return Object.assign({}, ...parties.map(p => validateParty(type, p)));
}

// A server's `details` is `{ path: [message, ...] }`; the form wants one
// message per field.
export function errorsFromDetails(details: Record<string, string[]>): FieldErrors {
  const errors: FieldErrors = {};
  for (const [path, messages] of Object.entries(details)) {
    if (messages.length > 0) errors[path] = messages[0];
  }
  return errors;
}

// A human name for a party, used as a section heading. "Nominee 2" only when
// there is more than one.
export function partyTitle(subject: FieldSubject, ordinal: number, count: number): string {
  const names: Record<FieldSubject, string> = {
    applicant: 'Applicant',
    employment: 'Employment',
    guardian: 'Guardian',
    nominee: 'Nominee',
    beneficiary: 'Beneficiary',
  };
  return count > 1 ? `${names[subject]} ${ordinal}` : names[subject];
}
