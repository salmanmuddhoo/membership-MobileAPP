// The lock, over everything. Not a route: wherever the person was, the
// screen beneath is covered until the PIN is right, and a device whose
// session has no PIN yet is asked to choose one — right after linking, or
// on the first start after updating from a build without PINs. A phone
// with a six-digit PIN from before PINs were four digits unlocks with it
// once, then chooses a four-digit one: never a new PIN without the old.
import React, { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { confirmDialog } from '../lib/dialog';
import { Button } from '../ui';
import { AnimatedLogo, FadeIn } from '../ui/Logo';
import { colors, spacing } from '../ui/theme';
import { useAuth } from './AuthContext';
import { isWeakPin, MAX_PIN_ATTEMPTS, PIN_LENGTH } from './pin';
import { PinEntry } from './PinEntry';

export function LockGate() {
  const { ready, session, pinSet, pinOutdated, locked } = useAuth();
  const needsSetup = ready && !!session && !pinSet;
  const show = needsSetup || locked;

  // The hardware back button must not pop the screen beneath the lock.
  useEffect(() => {
    if (!show) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [show]);

  if (!show) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <SafeAreaView style={styles.safe}>{locked ? <Unlock /> : <PinSetup replacing={pinOutdated} />}</SafeAreaView>
    </View>
  );
}

function PinSetup({ replacing }: { replacing: boolean }) {
  const { setPin } = useAuth();
  const [first, setFirst] = useState<string | null>(null);
  const [digits, setDigits] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function change(next: string) {
    setDigits(next);
    if (next.length === PIN_LENGTH) complete(next);
  }

  async function complete(pin: string) {
    setMessage(null);
    setDigits('');
    if (first === null) {
      if (isWeakPin(pin)) {
        setMessage('Choose a PIN that is harder to guess — not one digit repeated or a straight run.');
        return;
      }
      setFirst(pin);
      return;
    }
    if (pin !== first) {
      setMessage('The two PINs did not match. Start again.');
      setFirst(null);
      return;
    }
    setBusy(true);
    try {
      await setPin(pin);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.body}>
      <AnimatedLogo size={88} />
      <FadeIn delay={200}>
        <Text style={styles.title}>
          {first !== null ? 'Enter it once more' : replacing ? 'Choose a new PIN' : 'Choose a PIN'}
        </Text>
        <Text style={styles.subtitle}>
          {first !== null
            ? 'So we know you have it right.'
            : replacing
              ? `PINs are now ${PIN_LENGTH} digits. Choose a new one to open the app from now on.`
              : `${PIN_LENGTH} digits. You will use it to open the app from now on, instead of a code by SMS.`}
        </Text>
      </FadeIn>
      <View style={styles.message}>{message ? <Text style={styles.messageText}>{message}</Text> : null}</View>
      <PinEntry digits={digits} onChange={change} disabled={busy} />
    </View>
  );
}

function Unlock() {
  const router = useRouter();
  const { session, unlock, signOut, pinLength } = useAuth();
  const [digits, setDigits] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function change(next: string) {
    setDigits(next);
    if (next.length === pinLength) complete(next);
  }

  async function complete(pin: string) {
    setBusy(true);
    try {
      const result = await unlock(pin);
      setDigits('');
      if (result.ok) return;
      if (result.attemptsLeft === 0) {
        setMessage(null);
        router.replace({ pathname: '/(auth)/welcome', params: { reason: 'pin_locked' } });
        return;
      }
      setMessage(
        result.attemptsLeft === 1
          ? 'Wrong PIN. One more wrong PIN and this phone will be signed out.'
          : `Wrong PIN. ${result.attemptsLeft} attempts left of ${MAX_PIN_ATTEMPTS}.`
      );
    } finally {
      setBusy(false);
    }
  }

  async function forgot() {
    const ok = await confirmDialog(
      'Forgotten your PIN?',
      'This phone will be signed out. To get back in, link your membership again with a code sent to your registered mobile, then choose a new PIN.',
      'Sign out',
      true
    );
    if (!ok) return;
    await signOut();
    router.replace('/(auth)/welcome');
  }

  return (
    <View style={styles.body}>
      <AnimatedLogo size={88} />
      <FadeIn delay={200}>
        <Text style={styles.title}>Welcome back{session ? `, ${firstName(session.identity.displayName)}` : ''}</Text>
        <Text style={styles.subtitle}>Enter your PIN to open the app.</Text>
      </FadeIn>
      <View style={styles.message}>{message ? <Text style={styles.messageText}>{message}</Text> : null}</View>
      <PinEntry digits={digits} onChange={change} disabled={busy} length={pinLength} />
      <Button title="Forgotten your PIN?" variant="ghost" onPress={forgot} textStyle={{ color: 'rgba(255,255,255,0.85)' }} />
    </View>
  );
}

function firstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] ?? '';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  title: { fontSize: 24, fontWeight: '700', color: '#fff', textAlign: 'center', marginTop: spacing.sm },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: spacing.xs, maxWidth: 300 },
  message: { minHeight: 40, justifyContent: 'center', paddingHorizontal: spacing.lg },
  messageText: { color: '#FFD9D4', fontSize: 14, textAlign: 'center' },
});
