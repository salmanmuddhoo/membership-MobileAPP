import { useRouter } from 'expo-router';
import React from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ApiError } from '@/api';
import { useDependents } from '@/hooks/queries';
import { formatDate, formatMoney, statusLabel } from '@/lib/format';
import { Badge, Banner, Body, Button, Card, Empty, Loading, Row } from '@/ui';
import { colors, spacing, type } from '@/ui/theme';

// Read-only: the accounts and balances of the minors the member is guardian
// of. Moving a minor's money is done at a branch, so nothing here writes.
export default function Minors() {
  const router = useRouter();
  const dependents = useDependents();

  if (dependents.isLoading) return <Loading />;
  if (dependents.error) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Banner tone="danger">
          {dependents.error instanceof ApiError
            ? dependents.error.userMessage
            : 'Could not load.'}
        </Banner>
        <Button
          title="Try again"
          variant="secondary"
          onPress={() => dependents.refetch()}
        />
      </ScrollView>
    );
  }
  if (!dependents.data || dependents.data.length === 0) {
    return (
      <Empty title="No minors in your care">
        Minors you are the guardian of appear here.
      </Empty>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={dependents.isRefetching}
          onRefresh={() => dependents.refetch()}
          tintColor={colors.primary}
        />
      }
    >
      {dependents.data.map(minor => (
        <View key={minor.id} style={styles.minor}>
          <View style={styles.head}>
            <View style={{ flex: 1 }}>
              <Text style={type.subheading}>{minor.name}</Text>
              <Text style={type.small}>
                {[minor.memberNo, minor.relationship]
                  .filter(Boolean)
                  .join(' · ') || 'Minor'}
              </Text>
            </View>
            <Badge tone={minor.status === 'active' ? 'success' : 'warning'}>
              {statusLabel(minor.status)}
            </Badge>
          </View>
          {minor.accounts.length === 0 ? (
            <Body muted>No accounts yet.</Body>
          ) : (
            minor.accounts.map(a => (
              <Card
                key={a.id}
                onPress={() =>
                  router.push({
                    pathname: '/dependent/[dependentId]/account/[accountId]',
                    params: { dependentId: minor.id, accountId: a.id },
                  })
                }
              >
                <Row
                  label={a.typeName}
                  value={
                    <Text style={styles.balance}>{formatMoney(a.balance)}</Text>
                  }
                />
                <Row label="Account No." value={a.accountNo} />
                <Row label="Opened" value={formatDate(a.openedAt)} last />
              </Card>
            ))
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  minor: { marginBottom: spacing.lg },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  balance: { ...type.subheading, color: colors.primary },
});
