// The values of every party on a form, with edit, validate and "what
// changed since the last save" — shared by the sign-up wizard and the
// member's own details capture.
import { useCallback, useMemo, useState } from 'react';
import type { FieldSubject, MembershipType, PartyValues } from '../api/types';
import {
  errorsFromDetails,
  fieldPath,
  validateAll,
  validateParty,
  type FieldErrors,
} from './validate';

export function usePartyValues(type: MembershipType, initial: PartyValues[]) {
  const [parties, setParties] = useState<PartyValues[]>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [lastSaved, setLastSaved] = useState<string>(() => JSON.stringify(initial));

  const setValue = useCallback(
    (subject: FieldSubject, ordinal: number, fieldKey: string, value: string) => {
      setParties(prev =>
        prev.map(p =>
          p.subject === subject && p.ordinal === ordinal
            ? { ...p, values: { ...p.values, [fieldKey]: value } }
            : p
        )
      );
      // Typing into a field clears its error; the next validation decides.
      setErrors(prev => {
        const path = fieldPath(subject, ordinal, fieldKey);
        if (!(path in prev)) return prev;
        const next = { ...prev };
        delete next[path];
        return next;
      });
    },
    []
  );

  const validateOne = useCallback(
    (party: PartyValues): boolean => {
      const found = validateParty(type, party);
      setErrors(prev => {
        // Replace this party's errors, keep the others'.
        const prefix = `${party.subject}.${party.ordinal}.`;
        const kept = Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith(prefix)));
        return { ...kept, ...found };
      });
      return Object.keys(found).length === 0;
    },
    [type]
  );

  const validateEverything = useCallback((): boolean => {
    const found = validateAll(type, parties);
    setErrors(found);
    return Object.keys(found).length === 0;
  }, [type, parties]);

  const applyServerErrors = useCallback((details: Record<string, string[]>) => {
    setErrors(prev => ({ ...prev, ...errorsFromDetails(details) }));
  }, []);

  const dirty = useMemo(() => JSON.stringify(parties) !== lastSaved, [parties, lastSaved]);
  const markSaved = useCallback((saved: PartyValues[]) => {
    setLastSaved(JSON.stringify(saved));
  }, []);

  return {
    parties,
    setParties,
    setValue,
    errors,
    setErrors,
    validateOne,
    validateEverything,
    applyServerErrors,
    dirty,
    markSaved,
  };
}
