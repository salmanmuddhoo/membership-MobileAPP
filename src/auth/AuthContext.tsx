// Who is signed in, for every screen.
//
// The session (a bearer token and who it belongs to) is read from the device
// keychain once at start, kept in memory, and cleared on sign-out or on the
// first `unauthenticated` from the API — a token the server no longer
// accepts is not worth keeping.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api, ApiError, type Session } from '../api';
import { loadSession, saveSession } from './session-store';

interface AuthState {
  ready: boolean;
  session: Session | null;
  signIn: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
  // Run an API call with the current token; a rejected token signs out.
  withToken: <T>(fn: (token: string) => Promise<T>) => Promise<T>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSession().then(stored => {
      if (cancelled) return;
      setSession(stored);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (next: Session) => {
    setSession(next);
    await saveSession(next);
  }, []);

  const signOut = useCallback(async () => {
    const current = session;
    setSession(null);
    await saveSession(null);
    if (current) {
      // Best effort: the token is gone locally either way.
      api.logout(current.accessToken).catch(() => undefined);
    }
  }, [session]);

  const withToken = useCallback(
    async <T,>(fn: (token: string) => Promise<T>): Promise<T> => {
      if (!session) throw new ApiError('unauthenticated', 'Sign in to continue.');
      try {
        return await fn(session.accessToken);
      } catch (e) {
        if (e instanceof ApiError && e.code === 'unauthenticated') {
          setSession(null);
          await saveSession(null);
        }
        throw e;
      }
    },
    [session]
  );

  const value = useMemo(
    () => ({ ready, session, signIn, signOut, withToken }),
    [ready, session, signIn, signOut, withToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
