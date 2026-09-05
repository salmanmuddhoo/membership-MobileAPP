// Renders one party (the applicant, a nominee, the guardian…) from the
// membership type's field configuration. The form is not written down in
// this file — which fields appear, which are mandatory and in what order all
// come from configuration, exactly as on the officer's screen.
import React from 'react';
import type { KeyboardTypeOptions } from 'react-native';
import type { MembershipType, MembershipTypeField, PartyValues } from '../api/types';
import { ChoiceField, TextField } from '../ui';
import { fieldPath, visibleFields, type FieldErrors } from './validate';

function keyboardFor(field: MembershipTypeField): KeyboardTypeOptions {
  switch (field.dataType) {
    case 'phone':
      return 'phone-pad';
    case 'email':
      return 'email-address';
    case 'number':
      return 'decimal-pad';
    case 'date':
      return 'numbers-and-punctuation';
    default:
      return 'default';
  }
}

function hintFor(field: MembershipTypeField): string | undefined {
  switch (field.dataType) {
    case 'phone':
      return 'A Mauritian number as 8 digits, or any number starting with +.';
    case 'date':
      return 'YYYY-MM-DD';
    default:
      return undefined;
  }
}

export function PartyForm({
  type,
  party,
  errors,
  onChange,
  readOnlyKeys = [],
}: {
  type: MembershipType;
  party: PartyValues;
  errors: FieldErrors;
  onChange: (fieldKey: string, value: string) => void;
  // Fields shown but not editable — the mobile the person signed in with.
  readOnlyKeys?: string[];
}) {
  return (
    <>
      {visibleFields(type, party.subject).map(field => {
        const path = fieldPath(party.subject, party.ordinal, field.fieldKey);
        const value = party.values[field.fieldKey] ?? '';
        const error = errors[path] ?? null;
        if (field.dataType === 'choice') {
          return (
            <ChoiceField
              key={field.id}
              label={field.label}
              value={value}
              choices={field.choices}
              required={field.isMandatory}
              error={error}
              onChange={v => onChange(field.fieldKey, v)}
            />
          );
        }
        const readOnly = readOnlyKeys.includes(field.fieldKey);
        return (
          <TextField
            key={field.id}
            label={field.label}
            value={value}
            required={field.isMandatory}
            error={error}
            hint={readOnly ? 'The number you signed in with.' : hintFor(field)}
            editable={!readOnly}
            keyboardType={keyboardFor(field)}
            autoCapitalize={field.dataType === 'email' ? 'none' : field.fieldKey === 'address' ? 'sentences' : 'words'}
            autoCorrect={false}
            multiline={field.fieldKey === 'address'}
            onChangeText={v => onChange(field.fieldKey, v)}
          />
        );
      })}
    </>
  );
}
