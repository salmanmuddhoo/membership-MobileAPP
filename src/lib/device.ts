// Whether the phone looks rooted or jailbroken. A warning, not a wall:
// the check is heuristic (Expo marks it experimental) and a false alarm
// must not lock a member out, but a person should know their phone may
// expose what the app keeps on it.
import * as Device from 'expo-device';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

let known: boolean | null = null;

export async function isRootedDevice(): Promise<boolean> {
  if (known !== null) return known;
  if (Platform.OS === 'web') return (known = false);
  try {
    known = await Device.isRootedExperimentalAsync();
  } catch {
    known = false;
  }
  return known;
}

export function useRootedDevice(): boolean {
  const [rooted, setRooted] = useState(known ?? false);
  useEffect(() => {
    let cancelled = false;
    isRootedDevice().then(value => {
      if (!cancelled) setRooted(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return rooted;
}
