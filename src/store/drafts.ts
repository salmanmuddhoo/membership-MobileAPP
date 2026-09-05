// Values typed into a form, kept on the device between saves.
//
// The server holds the draft of record (S-302: saved continuously), but a
// phone loses signal in a way a desk does not. Whatever was typed since the
// last successful save lives here until it has been saved, so a dropped
// connection mid-form loses nothing. Nothing else is cached: a member's
// balance or a checklist read from a stale cache would be worse than a
// spinner.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PartyValues } from '../api/types';

const PREFIX = 'draft:';

export async function loadDraft(key: string): Promise<PartyValues[] | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as PartyValues[]) : null;
  } catch {
    return null;
  }
}

export async function storeDraft(key: string, parties: PartyValues[]): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(parties));
  } catch {
    // Local storage is a convenience; the server copy is the record.
  }
}

export async function clearDraft(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}
