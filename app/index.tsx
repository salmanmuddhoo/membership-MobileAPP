import { Redirect } from 'expo-router';
import React from 'react';
import { useAuth } from '@/auth/AuthContext';
import { Loading } from '@/ui';

export default function Index() {
  const { ready, session } = useAuth();
  if (!ready) return <Loading />;
  return <Redirect href={session ? '/(member)/home' : '/(auth)/welcome'} />;
}
