import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '@/api';
import { useAccounts, useTransactions } from '@/hooks/queries';
import { formatDate, formatMoney } from '@/lib/format';
import { Banner, Body, Card, Empty, Heading, Loading } from '@/ui';
import { Balance, BalanceToggle } from '@/ui/Balance';
import { colors, spacing, type } from '@/ui/theme';

export default function AccountDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const accounts = useAccounts();
  const tx = useTransactions(id);
  const account = accounts.data?.find(a => a.id === id);

  if (accounts.isLoading || tx.isLoading) return <Loading />;
  if (!account) return <Empty title="No such account" />;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={tx.isRefetching} onRefresh={() => tx.refetch()} tintColor={colors.primary} />}
    >
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={type.subheading}>{account.typeName}</Text>
          <Balance amount={account.balance} style={styles.balance} />
        </View>
        <BalanceToggle />
      </View>
      <Heading>Transactions</Heading>
      {tx.error ? (
        <Banner tone="danger">{tx.error instanceof ApiError ? tx.error.userMessage : 'Could not load.'}</Banner>
      ) : null}
      {tx.data && tx.data.length === 0 ? <Body muted>Nothing recorded yet.</Body> : null}
      {tx.data?.map(t => (
        <Card key={t.id} style={styles.tx}>
          <View style={styles.txRow}>
            <View style={{ flex: 1 }}>
              <Text style={type.body}>{t.description}</Text>
              <Text style={type.small}>{formatDate(t.occurredAt)}</Text>
            </View>
            <Text style={[styles.amount, t.direction === 'debit' && styles.debit]}>
              {t.direction === 'debit' ? '−' : '+'}
              {formatMoney(t.amount, '').trim()}
            </Text>
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  balance: { ...type.title, color: colors.primary, marginVertical: spacing.sm },
  tx: { paddingVertical: spacing.md },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  amount: { ...type.subheading, color: colors.success },
  debit: { color: colors.danger },
});
