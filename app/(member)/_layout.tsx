import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { useAuth } from '@/auth/AuthContext';
import { useMe } from '@/hooks/queries';
import { Loading } from '@/ui';
import { colors } from '@/ui/theme';

export default function MemberLayout() {
  const { ready, session } = useAuth();
  const me = useMe();
  if (!ready) return <Loading />;
  if (!session) return <Redirect href="/(auth)/welcome" />;

  // Which tabs this person has. Accounts and Transact belong to anyone who
  // holds an account (a member, or a non-member account holder); the card
  // is a member's; Applications is for whoever is not yet a member. Each
  // appears once the profile says so, rather than flashing at the wrong
  // person while it loads.
  const kind = me.data?.kind;
  const hasAccounts = kind === 'member' || kind === 'customer';
  const isMember = kind === 'member';
  const showApplications = !!kind && kind !== 'member';
  const tab = (shown: boolean) => (shown ? undefined : null);

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: 'Accounts',
          href: tab(hasAccounts),
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="card"
        options={{
          title: 'Cards',
          href: tab(isMember),
          tabBarIcon: ({ color, size }) => <Ionicons name="card-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="transact"
        options={{
          title: 'Transact',
          href: tab(hasAccounts),
          tabBarIcon: ({ color, size }) => <Ionicons name="swap-horizontal-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="applications"
        options={{
          title: 'Applications',
          href: tab(showApplications),
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'My details',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
