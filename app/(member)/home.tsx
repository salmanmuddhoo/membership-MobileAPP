// The landing page: what the Society is promoting, the member's money in
// one figure, and a way to every part of the app (officer direction — a
// promotional page with shortcuts, not a second accounts screen).
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { useAccounts, useApplications, useDependents, useMe, usePromotions } from '@/hooks/queries';
import { formatDate, statusLabel } from '@/lib/format';
import { sumMoney } from '@/lib/money';
import { Badge, Banner, Body, Button, Card, Spacer } from '@/ui';
import { Balance, BalanceToggle } from '@/ui/Balance';
import { PromotionCarousel, showablePromotions } from '@/ui/Carousel';
import { colors, radius, spacing, type } from '@/ui/theme';

type Shortcut = { title: string; icon: React.ComponentProps<typeof Ionicons>['name']; href: Href };

export default function Home() {
  const router = useRouter();
  const { session } = useAuth();
  const me = useMe();
  const accounts = useAccounts();
  const applications = useApplications();
  const dependents = useDependents();
  const promotions = usePromotions();

  const refreshing = me.isRefetching || accounts.isRefetching;
  const refresh = () => {
    me.refetch();
    accounts.refetch();
    applications.refetch();
    promotions.refetch();
  };

  const profile = me.data;
  const isMember = profile?.kind === 'member';
  const hasAccounts = profile?.kind === 'member' || profile?.kind === 'customer';
  const openApplication = applications.data?.find(a => !['approved', 'rejected'].includes(a.status));
  const problem = me.error instanceof ApiError ? me.error.userMessage : null;
  const total = accounts.data ? sumMoney(accounts.data.map(a => a.balance)) : null;
  const cards = promotions.data ? showablePromotions(promotions.data) : [];

  const shortcuts: Shortcut[] = [];
  if (hasAccounts) shortcuts.push({ title: 'Accounts', icon: 'wallet-outline', href: '/(member)/accounts' });
  if (isMember) shortcuts.push({ title: 'My card', icon: 'card-outline', href: '/(member)/card' });
  if (hasAccounts) shortcuts.push({ title: 'Transact', icon: 'swap-horizontal-outline', href: '/(member)/transact' });
  if (dependents.data && dependents.data.length > 0) {
    shortcuts.push({ title: 'Minors', icon: 'people-outline', href: '/(member)/accounts' });
  }
  if (profile && !isMember) shortcuts.push({ title: 'Applications', icon: 'document-text-outline', href: '/(member)/applications' });
  shortcuts.push({ title: 'My details', icon: 'person-circle-outline', href: '/(member)/profile' });

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
    >
      <Text style={type.small}>Assalamu alaikum</Text>
      <Text style={type.title}>{session?.identity.displayName ?? 'Member'}</Text>
      {isMember && profile?.memberNo ? (
        <View style={styles.memberNo}>
          <Text style={styles.memberNoLabel}>Member No.</Text>
          <Text style={styles.memberNoValue}>{profile.memberNo}</Text>
          <Badge tone={profile.status === 'active' ? 'success' : 'warning'}>{statusLabel(profile.status)}</Badge>
        </View>
      ) : (
        <Spacer />
      )}
      {problem ? <Banner tone="danger">{problem}</Banner> : null}

      {hasAccounts ? (
        <Pressable
          onPress={() => router.push('/(member)/accounts')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.total, pressed && { opacity: 0.9 }]}
        >
          <View style={styles.totalHead}>
            <Text style={styles.totalLabel}>Total balance</Text>
            <BalanceToggle color="rgba(255,255,255,0.9)" />
          </View>
          <Balance amount={accounts.data ? total : null} style={styles.totalValue} />
          <Text style={styles.totalHint}>
            {accounts.data
              ? `Across ${accounts.data.length} account${accounts.data.length === 1 ? '' : 's'}`
              : 'Loading…'}
          </Text>
        </Pressable>
      ) : null}

      <PromotionCarousel items={cards} />

      {profile?.pendingUpdate ? (
        <Banner tone="info" title="Details update pending">
          Sent {formatDate(profile.pendingUpdate.submittedAt)}. Staff will verify it before your record changes.
        </Banner>
      ) : profile?.lastUpdate?.status === 'declined' ? (
        <Banner tone="warning" title="Your details update was not applied">
          {profile.lastUpdate.comment ?? 'Visit a branch with your ID.'}
        </Banner>
      ) : null}

      {!isMember && !me.isLoading ? (
        <Card>
          <Text style={type.subheading}>Not a member yet</Text>
          <Spacer size="sm" />
          <Body muted>
            {openApplication
              ? `Your application ${openApplication.reference} is ${statusLabel(openApplication.status).toLowerCase()}.`
              : 'Apply on your phone in a few minutes. You will need your NIC and a proof of address.'}
          </Body>
          <Spacer />
          <Button
            title={openApplication ? 'Continue application' : 'Apply to become a member'}
            onPress={() =>
              openApplication
                ? router.push({ pathname: '/(apply)/[id]/form', params: { id: openApplication.id, step: '0' } })
                : router.push('/(apply)')
            }
          />
        </Card>
      ) : null}

      <View style={styles.grid}>
        {shortcuts.map(s => (
          <Pressable
            key={s.title}
            onPress={() => router.push(s.href)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.shortcut, pressed && styles.shortcutPressed]}
          >
            <View style={styles.shortcutIcon}>
              <Ionicons name={s.icon} size={24} color={colors.primary} />
            </View>
            <Text style={styles.shortcutText}>{s.title}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  memberNo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  memberNoLabel: { ...type.small },
  memberNoValue: { ...type.subheading, color: colors.primary },
  total: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  totalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600' },
  totalValue: { color: '#fff', fontSize: 32, fontWeight: '700', marginTop: spacing.xs },
  totalHint: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
  shortcut: {
    width: '30%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  shortcutPressed: { backgroundColor: colors.primarySoft },
  shortcutIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutText: { ...type.label, textAlign: 'center' },
});
