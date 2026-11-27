import { Stack } from 'expo-router';
import React from 'react';
import { stackHeader } from '@/ui/header';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={stackHeader}
    >
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="link" options={{ title: 'Link my membership' }} />
      <Stack.Screen name="sign-up" options={{ title: 'Become a member' }} />
      <Stack.Screen name="verify" options={{ title: 'Enter code' }} />
    </Stack>
  );
}
