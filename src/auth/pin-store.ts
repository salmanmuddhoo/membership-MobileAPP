// Where the PIN record lives: next to the session, in the keychain. Cleared
// with the session, so a device that links again sets a PIN again.
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createPinRecord, matchesPin, type PinRecord } from './pin';

const KEY = 'ab.member.pin';
let memory: PinRecord | null = null;

const digest = (text: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text);

export async function loadPinRecord(): Promise<PinRecord | null> {
  if (Platform.OS === 'web') return memory;
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    return raw ? (JSON.parse(raw) as PinRecord) : null;
  } catch {
    return null;
  }
}

export async function savePinRecord(record: PinRecord | null): Promise<void> {
  memory = record;
  if (Platform.OS === 'web') return;
  try {
    if (record) {
      await SecureStore.setItemAsync(KEY, JSON.stringify(record), {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } else {
      await SecureStore.deleteItemAsync(KEY);
    }
  } catch {
    // Same stance as the session: a device that refuses the keychain still
    // works for this run.
  }
}

export async function newPinRecord(pin: string): Promise<PinRecord> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  const salt = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  return createPinRecord(pin, salt, digest);
}

export function pinMatches(record: PinRecord, pin: string): Promise<boolean> {
  return matchesPin(record, pin, digest);
}
