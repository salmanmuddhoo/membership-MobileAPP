// Who is signed in, for every screen.
//
// The session (a bearer token, a refresh token and who they belong to) is
// read from the device keychain once at start and kept in memory. This is
// the authentication: once a member has linked the device (NIC + AB Number,
// then the code to their registered mobile), it is the session that gets
// them in — not the NIC and AB Number again. An access token the server no
// longer accepts is refreshed once; if that is refused too, the device is
// no longer linked and the person is signed out.
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
      // Best effort: the tokens are gone locally either way.
      api.logout(current.accessToken, current.refreshToken).catch(() => undefined);
    }
  }, [session]);

  const withToken = useCallback(
    async <T,>(fn: (token: string) => Promise<T>): Promise<T> => {
      if (!session) throw new ApiError('unauthenticated', 'Sign in to continue.');
      try {
        return await fn(session.accessToken);
      } catch (e) {
        if (!(e instanceof ApiError) || e.code !== 'unauthenticated') throw e;
      }
      // The access token was refused: rotate through the refresh token once.
      let renewed: Session;
      try {
        renewed = await api.refresh(session.refreshToken);
      } catch (refreshError) {
        setSession(null);
        await saveSession(null);
        throw refreshError;
      }
      setSession(renewed);
      await saveSession(renewed);
      return fn(renewed.accessToken);
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
