// Push notifications: registering this phone with the backend, and acting
// on a notification that arrives (docs/push-notifications.md).
//
// The token is Firebase's device token, obtained from the phone and sent
// to the backend, which sends through Firebase Cloud Messaging. It is tied
// to the session on the server: signing out disables it there, so a phone
// that has signed out hears nothing more. Nothing here is a secret — a
// token can only receive — but it is never logged.
//
// A build without a Firebase configuration (no google-services.json, see
// docs/push-notifications.md) has no token to give: the registration fails
// quietly and the app simply does not receive notifications.
import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { api } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { screenFor, staleKeysFor, type PushData } from '@/lib/push';
import { colors } from '@/ui/theme';

// How a notification that arrives while the app is open is shown: as a
// banner, like one that arrives while it is closed. Set once, at import.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const CHANNEL_ID = 'default';

// The token this app last told the backend about, so a sign-out can
// withdraw it. Module state rather than storage: a token is re-obtained
// on every start anyway.
let registered: string | null = null;

export function registeredPushToken(): string | null {
  return registered;
}

export function forgetPushToken(): void {
  registered = null;
}

async function obtainToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Al Barakah',
      importance: Notifications.AndroidImportance.MAX,
      lightColor: colors.primary,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  const status = current.granted ? current : await Notifications.requestPermissionsAsync();
  if (!status.granted) return null;
  const token = await Notifications.getDevicePushTokenAsync();
  return typeof token.data === 'string' && token.data ? token.data : null;
}

export function PushRegistration() {
  const { session, withToken } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const sessionKey = session ? session.identity.linkedAt : null;
  const busy = useRef(false);

  // Register on sign-in and on every cold start, and again whenever the
  // phone's token changes under the app.
  useEffect(() => {
    if (!sessionKey) return;
    let cancelled = false;
    const register = async (token: string) => {
      if (cancelled || busy.current) return;
      busy.current = true;
      try {
        await withToken(t =>
          api.registerDevice(t, {
            token,
            platform: Platform.OS === 'ios' ? 'ios' : 'android',
            appBuild: Constants.expoConfig?.version ?? null,
          })
        );
        registered = token;
      } catch {
        // The next start tries again; the app works without it.
      } finally {
        busy.current = false;
      }
    };
    obtainToken()
      .then(token => (token ? register(token) : undefined))
      .catch(() => undefined);
    const sub = Notifications.addPushTokenListener(next => {
      if (typeof next.data === 'string' && next.data && next.data !== registered) register(next.data);
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [sessionKey, withToken]);

  // A notification that arrives while the app is open means something on
  // the server changed: refetch it, so the balance is right by the time the
  // member looks.
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(n => {
      for (const key of staleKeysFor(n.request.content.data as PushData)) {
        qc.invalidateQueries({ queryKey: key });
      }
    });
    return () => sub.remove();
  }, [qc]);

  // A tap on a notification: open the screen it is about.
  const lastResponse = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!sessionKey || !lastResponse) return;
    const id = lastResponse.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;
    const data = lastResponse.notification.request.content.data as PushData;
    for (const key of staleKeysFor(data)) qc.invalidateQueries({ queryKey: key });
    router.push(screenFor(data));
  }, [lastResponse, sessionKey, qc, router]);

  return null;
}
