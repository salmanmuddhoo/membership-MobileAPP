import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ApiError } from '@/api';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { LockGate } from '@/auth/LockGate';
import { BalanceVisibilityProvider } from '@/store/balances';
import { colors } from '@/ui/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A refused request will be refused again; only a network blip is
      // worth a second try.
      retry: (count, error) =>
        count < 2 && error instanceof ApiError && error.code === 'network',
      staleTime: 30_000,
    },
  },
});

// The native splash (the emblem on green) stays up until the keychain has
// been read, so the app opens straight onto the lock or the home screen —
// never a blank frame and a spinner in between.
SplashScreen.preventAutoHideAsync().catch(() => undefined);
SplashScreen.setOptions({ duration: 400, fade: true });

function HideSplashWhenReady() {
  const { ready } = useAuth();
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);
  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <BalanceVisibilityProvider>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: colors.primary },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: '600' },
                contentStyle: { backgroundColor: colors.bg },
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(member)" options={{ headerShown: false }} />
              <Stack.Screen name="(apply)" options={{ headerShown: false }} />
              <Stack.Screen name="account/[id]" options={{ title: 'Account' }} />
              <Stack.Screen
                name="dependent/[dependentId]/account/[accountId]"
                options={{ title: 'Account' }}
              />
              <Stack.Screen name="details-edit" options={{ title: 'My details' }} />
            </Stack>
            <LockGate />
            <HideSplashWhenReady />
            </BalanceVisibilityProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
