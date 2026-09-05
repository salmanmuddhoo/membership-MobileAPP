import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ApiError } from '@/api';
import { AuthProvider } from '@/auth/AuthContext';
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

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
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
              <Stack.Screen name="details-edit" options={{ title: 'My details' }} />
            </Stack>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
