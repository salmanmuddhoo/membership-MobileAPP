// Who is signed in, for every screen — and whether the app is unlocked.
//
// The session (a bearer token, a refresh token and who they belong to) is
// read from the device keychain once at start and kept in memory. This is
// the authentication: once a member has linked the device (NIC + AB Number,
// then the code to their registered mobile), it is the session that gets
// them in — not the NIC and AB Number again. An access token the server no
// longer accepts is refreshed once; if that is refused too, the device is
// no longer linked and the person is signed out.
//
// The refresh token is single-use: the server kills it the moment it is
// presented. Screens fire several requests at once, so when the access token
// has expired they all fail together — and they must share ONE refresh, or
// the second to arrive presents a dead token, is refused, and signs the
// member out for no reason. That is what `renewal` is for.
//
// The PIN (pin.ts) locks the app on the device: asked for on a cold start
// and after a while in the background. It never replaces the session, and
// five wrong PINs revoke it.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { api, ApiError, type Session } from '../api';
import { attemptsLeft, MAX_PIN_ATTEMPTS, type PinRecord } from './pin';
import { loadPinRecord, newPinRecord, pinMatches, savePinRecord } from './pin-store';
import { loadSession, saveSession } from './session-store';

// How long the app may sit in the background before the PIN is asked again.
// Short enough that a phone left on a desk is covered; long enough that
// choosing a photo for an application does not come back to a lock screen.
export const LOCK_AFTER_MS = 2 * 60_000;

export type UnlockResult = { ok: true } | { ok: false; attemptsLeft: number };

interface AuthState {
  ready: boolean;
  session: Session | null;
  // A PIN has been set on this device for this session.
  pinSet: boolean;
  // The PIN is due before anything else is shown.
  locked: boolean;
  signIn: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
  setPin: (pin: string) => Promise<void>;
  // A wrong PIN counts; the last wrong one signs the device out.
  unlock: (pin: string) => Promise<UnlockResult>;
  // Run an API call with the current token; a rejected token signs out.
  withToken: <T>(fn: (token: string) => Promise<T>) => Promise<T>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSessionState] = useState<Session | null>(null);
  const [pin, setPinState] = useState<PinRecord | null>(null);
  const [locked, setLocked] = useState(false);

  // The latest session for callers that outlive a render (withToken while
  // a refresh is in flight), and the one refresh everyone waits on.
  const sessionRef = useRef<Session | null>(null);
  const pinRef = useRef<PinRecord | null>(null);
  const renewal = useRef<Promise<Session> | null>(null);
  const hiddenAt = useRef<number | null>(null);

  const applySession = useCallback(async (next: Session | null) => {
    sessionRef.current = next;
    setSessionState(next);
    await saveSession(next);
  }, []);

  const applyPin = useCallback(async (next: PinRecord | null) => {
    pinRef.current = next;
    setPinState(next);
    await savePinRecord(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadSession(), loadPinRecord()]).then(([storedSession, storedPin]) => {
      if (cancelled) return;
      sessionRef.current = storedSession;
      pinRef.current = storedSession ? storedPin : null;
      setSessionState(storedSession);
      setPinState(storedSession ? storedPin : null);
      // A cold start with a linked device and a PIN opens on the lock.
      setLocked(!!storedSession && !!storedPin);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Back from the background after a while: lock again.
  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') {
        const away = hiddenAt.current;
        hiddenAt.current = null;
        if (away !== null && Date.now() - away >= LOCK_AFTER_MS && sessionRef.current && pinRef.current) {
          setLocked(true);
        }
      } else if (hiddenAt.current === null) {
        hiddenAt.current = Date.now();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  const signIn = useCallback(
    async (next: Session) => {
      // A new link is a new PIN: whoever just proved the mobile sets it.
      await applyPin(null);
      setLocked(false);
      await applySession(next);
    },
    [applyPin, applySession]
  );

  const signOut = useCallback(async () => {
    const current = sessionRef.current;
    setLocked(false);
    await applyPin(null);
    await applySession(null);
    if (current) {
      // Best effort: the tokens are gone locally either way.
      api.logout(current.accessToken, current.refreshToken).catch(() => undefined);
    }
  }, [applyPin, applySession]);

  const setPin = useCallback(
    async (value: string) => {
      await applyPin(await newPinRecord(value));
      setLocked(false);
    },
    [applyPin]
  );

  const unlock = useCallback(
    async (value: string): Promise<UnlockResult> => {
      const record = pinRef.current;
      if (!record) {
        setLocked(false);
        return { ok: true };
      }
      if (await pinMatches(record, value)) {
        if (record.failures > 0) await applyPin({ ...record, failures: 0 });
        setLocked(false);
        return { ok: true };
      }
      const failed = { ...record, failures: record.failures + 1 };
      if (failed.failures >= MAX_PIN_ATTEMPTS) {
        // The device is no longer trusted: the session goes with the PIN.
        await signOut();
        return { ok: false, attemptsLeft: 0 };
      }
      await applyPin(failed);
      return { ok: false, attemptsLeft: attemptsLeft(failed) };
    },
    [applyPin, signOut]
  );

  // The session after the one whose access token was just refused — shared
  // by every caller refused at the same time, and skipped when another
  // caller has already done it.
  const renew = useCallback(
    (refusedToken: string): Promise<Session> => {
      const current = sessionRef.current;
      if (!current) return Promise.reject(new ApiError('unauthenticated', 'Sign in to continue.'));
      if (current.accessToken !== refusedToken) return Promise.resolve(current);
      if (!renewal.current) {
        renewal.current = api
          .refresh(current.refreshToken)
          .then(
            async renewed => {
              await applySession(renewed);
              return renewed;
            },
            async (error: unknown) => {
              // Only a refusal means the device is no longer linked. A
              // network failure leaves the session where it is for the
              // next attempt.
              if (error instanceof ApiError && error.code === 'unauthenticated') {
                await applyPin(null);
                await applySession(null);
              }
              throw error;
            }
          )
          .finally(() => {
            renewal.current = null;
          });
      }
      return renewal.current;
    },
    [applyPin, applySession]
  );

  const withToken = useCallback(
    async <T,>(fn: (token: string) => Promise<T>): Promise<T> => {
      const current = sessionRef.current;
      if (!current) throw new ApiError('unauthenticated', 'Sign in to continue.');
      try {
        return await fn(current.accessToken);
      } catch (e) {
        if (!(e instanceof ApiError) || e.code !== 'unauthenticated') throw e;
      }
      const renewed = await renew(current.accessToken);
      return fn(renewed.accessToken);
    },
    [renew]
  );

  const value = useMemo(
    () => ({
      ready,
      session,
      pinSet: !!pin,
      locked: locked && !!session && !!pin,
      signIn,
      signOut,
      setPin,
      unlock,
      withToken,
    }),
    [ready, session, pin, locked, signIn, signOut, setPin, unlock, withToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
