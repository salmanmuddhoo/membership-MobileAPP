// Every account the person can see: their own, then those of the minors in
// their care, told apart on sight. A balance each, nothing else — the
// account number, status and opening date are branch matters (officer
// direction). Tap one for its transactions.
import { useRouter } from 'expo-router';
import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApiError, type AccountSummary } from '@/api';
import { useAccounts, useDependents, useMe } from '@/hooks/queries';
import { Banner, Body, Button, Card, Empty, Heading, Loading } from '@/ui';
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
  const own = accounts.data ?? [];
  const minors = dependents.data ?? [];
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
      <View style={styles.head}>
        <Heading>My accounts</Heading>
        <BalanceToggle />
      </View>
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

function AccountCard({ account, minor, onPress }: { account: AccountSummary; minor?: boolean; onPress: () => void }) {
  return (
    <Card onPress={onPress} style={minor ? styles.minorCard : undefined}>
      <View style={styles.cardRow}>
        <View style={{ flex: 1 }}>
          <Text style={type.subheading}>{account.typeName}</Text>
          {minor ? <Text style={styles.minorTag}>Minor&apos;s account</Text> : null}
        </View>
        <Balance amount={account.balance} style={styles.balance} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  balance: { ...type.heading, color: colors.primary },
  minor: { marginTop: spacing.lg },
  minorHint: { ...type.small, marginTop: -spacing.sm, marginBottom: spacing.md },
  minorCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
    borderTopLeftRadius: radius.sm,
    borderBottomLeftRadius: radius.sm,
  },
  minorTag: { ...type.small, color: colors.warning, marginTop: 2 },
});
