import { useRouter } from 'expo-router';
import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { useAccounts, useApplications, useMe } from '@/hooks/queries';
import { formatDate, formatMoney, statusLabel } from '@/lib/format';
import { Badge, Banner, Body, Button, Card, Heading, Row, Spacer } from '@/ui';
import { colors, spacing, type } from '@/ui/theme';

export default function Home() {
  const router = useRouter();
  const { session } = useAuth();
  const me = useMe();
  const accounts = useAccounts();
  const applications = useApplications();

  const refreshing = me.isRefetching || accounts.isRefetching;
  const refresh = () => {
    me.refetch();
    accounts.refetch();
    applications.refetch();
  };

  const profile = me.data;
  const isMember = profile?.kind === 'member';
  const openApplication = applications.data?.find(a => !['approved', 'rejected'].includes(a.status));
  const problem = me.error instanceof ApiError ? me.error.userMessage : null;

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
      ) : null}
      {problem ? <Banner tone="danger">{problem}</Banner> : null}

      {profile?.pendingUpdate ? (
        <Banner tone="info" title="Details update pending">
          Sent {formatDate(profile.pendingUpdate.submittedAt)}. Staff will verify it before your record changes.
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

      {isMember ? (
        <>
          <Heading>Accounts</Heading>
          {accounts.data?.map(a => (
            <Card key={a.id} onPress={() => router.push({ pathname: '/account/[id]', params: { id: a.id } })}>
              <Row label={a.typeName} value={<Text style={styles.balance}>{formatMoney(a.balance)}</Text>} />
              <Row label="Account No." value={a.accountNo} last />
            </Card>
          ))}
          {accounts.data && accounts.data.length === 0 ? <Body muted>No accounts yet.</Body> : null}
        </>
      ) : null}

      {isMember ? (
        <>
          <Heading>Membership</Heading>
          <Card>
            <Row label="Type" value={profile?.membershipType?.name ?? '—'} />
            <Row label="Member since" value={formatDate(profile?.joinedAt)} last />
          </Card>
          <Button title="Check or update my details" variant="secondary" onPress={() => router.push('/(member)/profile')} />
        </>
      ) : null}
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
  balance: { ...type.subheading, color: colors.primary },
});
