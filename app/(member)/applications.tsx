import { useRouter } from 'expo-router';
import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApiError, type Application } from '@/api';
import { useApplications } from '@/hooks/queries';
import { formatDate, statusLabel } from '@/lib/format';
import { Badge, Banner, Button, Card, Empty, Loading, Row } from '@/ui';
import { colors, spacing, type } from '@/ui/theme';

function tone(status: Application['status']) {
  switch (status) {
    case 'approved':
      return 'success' as const;
    case 'rejected':
      return 'danger' as const;
    case 'returned':
      return 'warning' as const;
    default:
      return 'info' as const;
  }
}

export default function Applications() {
  const router = useRouter();
  const apps = useApplications();

  if (apps.isLoading) return <Loading />;

  const open = (a: Application) =>
    ['draft', 'returned'].includes(a.status)
      ? router.push({ pathname: '/(apply)/[id]/form', params: { id: a.id, step: '0' } })
      : router.push({ pathname: '/(apply)/[id]/status', params: { id: a.id } });

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={apps.isRefetching} onRefresh={() => apps.refetch()} tintColor={colors.primary} />}
    >
      {apps.error ? (
        <Banner tone="danger">{apps.error instanceof ApiError ? apps.error.userMessage : 'Could not load.'}</Banner>
      ) : null}
      {apps.data && apps.data.length === 0 ? (
        <View style={{ minHeight: 320 }}>
          <Empty title="No applications">Applications you start on this phone are listed here.</Empty>
          <Button title="Apply to become a member" onPress={() => router.push('/(apply)')} />
        </View>
      ) : null}
      {apps.data?.map(a => (
        <Card key={a.id} onPress={() => open(a)}>
          <View style={styles.head}>
            <Text style={type.subheading}>{a.membershipTypeName} membership</Text>
            <Badge tone={tone(a.status)}>{statusLabel(a.status)}</Badge>
          </View>
          <Row label="Reference" value={a.reference} />
          <Row label={a.submittedAt ? 'Submitted' : 'Last saved'} value={formatDate(a.submittedAt ?? a.updatedAt)} last />
          {a.status === 'returned' && a.returnComment ? (
            <Banner tone="warning" title="Returned for correction">{a.returnComment}</Banner>
          ) : null}
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.sm },
});
