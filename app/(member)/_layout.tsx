import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/AuthContext';
import { useMe } from '@/hooks/queries';
import { Loading } from '@/ui';
import { TabIcon } from '@/ui/TabIcon';
import { colors } from '@/ui/theme';

export default function MemberLayout() {
  const { ready, session } = useAuth();
  const me = useMe();
  // The phone's own navigation bar (gesture strip or three buttons) sits
  // over the bottom of the screen; the tab bar makes room for it.
  const insets = useSafeAreaInsets();
  if (!ready) return <Loading />;
  if (!session) return <Redirect href="/(auth)/welcome" />;

  // Which tabs this person has. Accounts and Transact belong to anyone who
  // holds an account (a member, or a non-member account holder); the card
  // is a member's; Applications is for whoever is not yet a member. Each
  // appears once the profile says so, rather than flashing at the wrong
  // person while it loads. Transact sits in the middle of the bar.
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
        tabBarStyle: { height: 58 + insets.bottom, paddingTop: 6, paddingBottom: insets.bottom + 4 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: props => <TabIcon name="home-outline" {...props} /> }} />
      <Tabs.Screen
        name="accounts"
        options={{ title: 'Accounts', href: tab(hasAccounts), tabBarIcon: props => <TabIcon name="wallet-outline" {...props} /> }}
      />
      <Tabs.Screen
        name="transact"
        options={{ title: 'Transact', href: tab(hasAccounts), tabBarIcon: props => <TabIcon name="swap-horizontal-outline" {...props} /> }}
      />
      <Tabs.Screen name="card" options={{ title: 'Cards', href: tab(isMember), tabBarIcon: props => <TabIcon name="card-outline" {...props} /> }} />
      <Tabs.Screen
        name="applications"
        options={{
          title: 'Applications',
          href: tab(showApplications),
          tabBarIcon: props => <TabIcon name="document-text-outline" {...props} />,
        }}
      />
      <Tabs.Screen name="profile" options={{ title: 'My details', tabBarIcon: props => <TabIcon name="person-circle-outline" {...props} /> }} />
    </Tabs>
  );
}
