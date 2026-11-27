import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/AuthContext';
import { useMe } from '@/hooks/queries';
import { Loading } from '@/ui';
import { tabHeader } from '@/ui/header';
import { CenterTabButton, TabIcon } from '@/ui/TabIcon';
import { TestBadge } from '@/ui/TestBadge';
import { colors, shadow } from '@/ui/theme';

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
  // is a member's; Applications is for whoever is not yet a member.
  // Transact sits in the middle of the bar, as a raised round button.
  //
  // The session already says who this is — it comes out of the keychain
  // before the first frame — so the bar is complete from the start. It
  // used to wait for the profile request, and showed Home and My details
  // alone for a moment on every open (officer report). The profile still
  // wins once it arrives, should the two ever disagree.
  const kind = me.data?.kind ?? session.identity.kind;
  const hasAccounts = kind === 'member' || kind === 'customer';
  const isMember = kind === 'member';
  const showApplications = kind !== 'member';
  const tab = (shown: boolean) => (shown ? undefined : null);

  return (
    <Tabs
      screenOptions={{
        ...tabHeader,
        // The test app says so on every screen (docs/environments.md).
        headerRight: () => <TestBadge />,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 4 },
        tabBarStyle: {
          height: 72 + insets.bottom,
          paddingTop: 10,
          paddingBottom: insets.bottom + 8,
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          ...shadow.raised,
        },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      {/* Home draws its own header: the greeting over the brand's emerald. */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: props => <TabIcon name="home-outline" activeName="home" {...props} />,
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: 'Accounts',
          href: tab(hasAccounts),
          tabBarIcon: props => <TabIcon name="wallet-outline" activeName="wallet" {...props} />,
        }}
      />
      {/* href and tabBarButton cannot go together: hidden, it is only hidden. */}
      <Tabs.Screen
        name="transact"
        options={hasAccounts ? { title: 'Transact', tabBarButton: CenterTabButton } : { title: 'Transact', href: null }}
      />
      <Tabs.Screen
        name="card"
        options={{
          title: 'Cards',
          href: tab(isMember),
          tabBarIcon: props => <TabIcon name="card-outline" activeName="card" {...props} />,
        }}
      />
      <Tabs.Screen
        name="applications"
        options={{
          title: 'Applications',
          href: tab(showApplications),
          tabBarIcon: props => <TabIcon name="document-text-outline" activeName="document-text" {...props} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'My details',
          tabBarIcon: props => <TabIcon name="person-circle-outline" activeName="person-circle" {...props} />,
        }}
      />
    </Tabs>
  );
}
