// Where the session lives on the device: the platform keychain / keystore
// via SecureStore, never AsyncStorage (which is a plain file). On web,
// SecureStore is unavailable, so the session is held in memory only and a
// reload signs the person out — acceptable for a preview build.
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Session } from '../api/types';

const KEY = 'ab.member.session';
let memory: Session | null = null;

export async function loadSession(): Promise<Session | null> {
  if (Platform.OS === 'web') return memory;
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export async function saveSession(session: Session | null): Promise<void> {
  memory = session;
  if (Platform.OS === 'web') return;
  try {
    if (session) {
      await SecureStore.setItemAsync(KEY, JSON.stringify(session), {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } else {
      await SecureStore.deleteItemAsync(KEY);
    }
  } catch {
    // A device that refuses the keychain still works for this run.
  }
}
