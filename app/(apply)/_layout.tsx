import { Redirect, Stack } from 'expo-router';
import React from 'react';
import { useAuth } from '@/auth/AuthContext';
import { Loading } from '@/ui';
import { colors } from '@/ui/theme';

export default function ApplyLayout() {
  const { ready, session } = useAuth();
  if (!ready) return <Loading />;
  if (!session) return <Redirect href="/(auth)/sign-up" />;
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Apply' }} />
      <Stack.Screen name="[id]/form" options={{ title: 'Your details' }} />
      <Stack.Screen name="[id]/documents" options={{ title: 'Documents' }} />
      <Stack.Screen name="[id]/review" options={{ title: 'Review and submit' }} />
      <Stack.Screen name="[id]/status" options={{ title: 'Application' }} />
    </Stack>
  );
}
