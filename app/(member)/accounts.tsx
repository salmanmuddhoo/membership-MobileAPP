// Every account the person can see with something recorded against it:
// their own, then those of the minors in their care, told apart on sight.
// A balance each, nothing else — the account number, status and opening
// date are branch matters (officer direction). Tap one for its
// transactions.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApiError, type AccountSummary } from '@/api';
import { useAccounts, useDependents, useMe } from '@/hooks/queries';
import { Banner, Body, Button, Card, Empty, Eyebrow, Heading, Loading } from '@/ui';
import { Balance, BalanceToggle } from '@/ui/Balance';
import { colors, radius, spacing, type } from '@/ui/theme';

export default function Accounts() {
  const router = useRouter();
  const me = useMe();
  const accounts = useAccounts();
  const dependents = useDependents();

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

      {minors.map(minor => (
        <View key={minor.id} style={styles.minor}>
          <Heading>{minor.name}</Heading>
          <Text style={styles.minorHint}>
            Minor in your care{minor.relationship ? ` · ${minor.relationship}` : ''}
            {minor.memberNo ? ` · ${minor.memberNo}` : ''}
          </Text>
          {minor.accounts.length === 0 ? <Body muted>No accounts yet.</Body> : null}
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
      ))}
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
  minor: { marginTop: spacing.sm },
  minorHint: { ...type.small, marginTop: -spacing.sm, marginBottom: spacing.md },
  minorTag: { fontSize: 12, fontWeight: '600', color: colors.accentInk, marginTop: 2 },
});
