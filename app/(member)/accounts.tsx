import { useRouter } from 'expo-router';
import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { ApiError } from '@/api';
import { useAccounts, useMe } from '@/hooks/queries';
import { formatDate, formatMoney, statusLabel } from '@/lib/format';
import { Badge, Banner, Button, Card, Empty, Loading, Row } from '@/ui';
import { colors, spacing, type } from '@/ui/theme';

export default function Accounts() {
  const router = useRouter();
  const me = useMe();
  const accounts = useAccounts();

  if (accounts.isLoading) return <Loading />;
  if (accounts.error) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Banner tone="danger">{accounts.error instanceof ApiError ? accounts.error.userMessage : 'Could not load.'}</Banner>
        <Button title="Try again" variant="secondary" onPress={() => accounts.refetch()} />
      </ScrollView>
    );
  }
  if (!accounts.data || accounts.data.length === 0) {
    return (
      <Empty title="No accounts">
        {me.data?.kind === 'applicant'
          ? 'Accounts are opened when a membership application is approved.'
          : 'No accounts are open under your membership.'}
      </Empty>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={accounts.isRefetching} onRefresh={() => accounts.refetch()} tintColor={colors.primary} />}
    >
      {accounts.data.map(a => (
        <Card key={a.id} onPress={() => router.push({ pathname: '/account/[id]', params: { id: a.id } })}>
          <Text style={type.subheading}>{a.typeName}</Text>
          <Text style={styles.balance}>{formatMoney(a.balance)}</Text>
          <Row label="Account No." value={a.accountNo} />
          <Row label="Opened" value={formatDate(a.openedAt)} />
          <Row label="Status" value={<Badge tone={a.status === 'active' ? 'success' : 'warning'}>{statusLabel(a.status)}</Badge>} last />
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  balance: { ...type.title, color: colors.primary, marginVertical: spacing.sm },
});
