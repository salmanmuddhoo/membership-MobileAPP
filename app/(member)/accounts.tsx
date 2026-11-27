// Every account the person can see with something recorded against it:
// their own, then those of the minors in their care, told apart on sight.
// A balance each, nothing else — the account number, status and opening
// date are branch matters (officer direction). Tap one for its
// transactions. Each minor's accounts fold away under the minor's name,
// closed until it is tapped, so the member's own come first.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApiError, type AccountSummary } from '@/api';
import { useAccounts, useDependents, useMe } from '@/hooks/queries';
import { initials } from '@/lib/names';
import { Banner, Body, Button, Card, Empty, Eyebrow, Loading } from '@/ui';
import { Balance, BalanceToggle } from '@/ui/Balance';
import { colors, radius, shadow, spacing, type } from '@/ui/theme';

export default function Accounts() {
  const router = useRouter();
  const me = useMe();
  const accounts = useAccounts();
  const dependents = useDependents();
  // Which minors are open; none, to start with.
  const [open, setOpen] = useState<Record<string, boolean>>({});

  if (accounts.isLoading) return <Loading />;
  if (accounts.error) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Banner tone="danger">{accounts.error instanceof ApiError ? accounts.error.userMessage : 'Could not load.'}</Banner>
        <Button title="Try again" variant="secondary" onPress={() => accounts.refetch()} />
      </ScrollView>
    );
  }
  // An account with nothing recorded against it yet is not shown (officer
  // direction): a savings account opened on approval sits empty until the
  // first deposit, and until then it is noise.
  const own = (accounts.data ?? []).filter(hasActivity);
  const minors = (dependents.data ?? [])
    .map(m => ({ ...m, accounts: m.accounts.filter(hasActivity) }))
    .filter(m => m.accounts.length > 0);
  if (own.length === 0 && minors.length === 0) {
    return (
      <Empty title="No accounts">
        {me.data?.kind === 'applicant'
          ? 'Accounts are opened when a membership application is approved.'
          : 'No accounts are open under your membership.'}
      </Empty>
    );
  }

  const refresh = () => {
    accounts.refetch();
    dependents.refetch();
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={accounts.isRefetching} onRefresh={refresh} tintColor={colors.primary} />}
    >
      <Eyebrow style={styles.firstEyebrow} right={<BalanceToggle />}>
        My accounts
      </Eyebrow>
      {own.length === 0 ? <Body muted>No accounts are open under your membership.</Body> : null}
      {own.map(a => (
        <AccountCard
          key={a.id}
          account={a}
          onPress={() => router.push({ pathname: '/account/[id]', params: { id: a.id } })}
        />
      ))}

      {minors.length > 0 ? <Eyebrow>Minors in your care</Eyebrow> : null}
      {minors.map(minor => {
        const expanded = !!open[minor.id];
        const count = `${minor.accounts.length} account${minor.accounts.length === 1 ? '' : 's'}`;
        const about = [minor.relationship, minor.memberNo, count].filter(Boolean).join(' · ');
        return (
          <View key={minor.id}>
            <Pressable
              onPress={() => setOpen(prev => ({ ...prev, [minor.id]: !prev[minor.id] }))}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              accessibilityLabel={`${minor.name}, ${count}`}
              accessibilityHint={expanded ? 'Hides their accounts' : 'Shows their accounts'}
              style={({ pressed }) => [styles.minorHead, pressed && styles.pressed]}
            >
              <View style={styles.minorAvatar}>
                <Text style={styles.minorAvatarText}>{initials(minor.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={type.subheading} numberOfLines={2}>
                  {minor.name}
                </Text>
                <Text style={styles.minorHint}>{about}</Text>
              </View>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />
            </Pressable>
            {expanded ? (
              <View style={styles.minorAccounts}>
                {minor.accounts.map(a => (
                  <AccountCard
                    key={a.id}
                    account={a}
                    minor
                    onPress={() =>
                      router.push({
                        pathname: '/dependent/[dependentId]/account/[accountId]',
                        params: { dependentId: minor.id, accountId: a.id },
                      })
                    }
                  />
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

function hasActivity(account: AccountSummary): boolean {
  return account.transactionCount > 0;
}

// Shares look like shares, savings like a wallet; a minor's account is
// gold where the member's own are emerald, so they are told apart on sight.
function AccountCard({ account, minor, onPress }: { account: AccountSummary; minor?: boolean; onPress: () => void }) {
  const shares = /share/i.test(account.typeName);
  return (
    <Card onPress={onPress}>
      <View style={styles.cardRow}>
        <View style={[styles.icon, minor && styles.iconMinor]}>
          <Ionicons
            name={shares ? 'pie-chart-outline' : 'wallet-outline'}
            size={22}
            color={minor ? colors.accentInk : colors.primary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={type.subheading} numberOfLines={2}>
            {account.typeName}
          </Text>
          {minor ? <Text style={styles.minorTag}>Minor&apos;s account</Text> : null}
          <Balance amount={account.balance} style={styles.balance} />
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.subtle} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  firstEyebrow: { marginTop: 0 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md + 2 },
  icon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconMinor: { backgroundColor: colors.accentSoft },
  balance: { ...type.heading, fontSize: 20, marginTop: spacing.xs, fontVariant: ['tabular-nums'] },
  minorHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md + 2,
    padding: spacing.lg + 2,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  minorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minorAvatarText: { color: colors.accentInk, fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  minorHint: { ...type.small, fontSize: 13, marginTop: 2 },
  // Opened, the minor's accounts hang from a gold line beneath the name.
  minorAccounts: {
    marginLeft: spacing.xl,
    paddingLeft: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.accentSoft,
    marginBottom: spacing.sm,
  },
  minorTag: { fontSize: 12, fontWeight: '600', color: colors.accentInk, marginTop: 2 },
});
