// Moving money from the app, and following what was asked for.
//
// Every deposit, withdrawal and transfer made here is validated by the
// Society's officers before any money moves (officer direction): a deposit
// by the accounts department; a withdrawal by the Secretary and the
// President, then paid out by the Treasurer; a transfer by the Secretary
// and the President. Until they decide, the request shows below as
// "Pending approval", with who has it. A guardian asks for the minors in
// their care the same way, and those requests are listed here too, named.
// The transaction's own reference is the office's, not shown here (officer
// direction).
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApiError, type MemberOperation, type MemberRequest } from '@/api';
import { useReference, useRequests } from '@/hooks/queries';
import { formatDate, formatMoney } from '@/lib/format';
import { requestTitle, sortRequests, toneFor } from '@/lib/transact';
import { Badge, Banner, Body, Card, Heading, Loading } from '@/ui';
import { colors, radius, spacing, type } from '@/ui/theme';

const ACTIONS: {
  op: MemberOperation;
  title: string;
  detail: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  href: '/transact/deposit' | '/transact/withdrawal' | '/transact/transfer';
}[] = [
  { op: 'deposit', title: 'Deposit', detail: 'Tell us about money you paid in', icon: 'arrow-down-circle-outline', href: '/transact/deposit' },
  { op: 'withdrawal', title: 'Withdraw', detail: 'Ask for money out', icon: 'arrow-up-circle-outline', href: '/transact/withdrawal' },
  { op: 'transfer', title: 'Transfer', detail: 'Between your accounts', icon: 'swap-horizontal-outline', href: '/transact/transfer' },
];

const KIND_ICON: Record<MemberOperation, React.ComponentProps<typeof Ionicons>['name']> = {
  deposit: 'arrow-down-circle',
  withdrawal: 'arrow-up-circle',
  transfer: 'swap-horizontal',
};

export default function Transact() {
  const router = useRouter();
  const reference = useReference();
  const requests = useRequests();

  if (reference.isLoading) return <Loading />;
  const enabled = reference.data?.enabledOperations ?? [];
  const list = sortRequests(requests.data ?? []);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={requests.isRefetching}
          onRefresh={() => {
            requests.refetch();
            reference.refetch();
          }}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.actions}>
        {ACTIONS.map(a => {
          const on = enabled.includes(a.op);
          return (
            <Pressable
              key={a.op}
              onPress={() => router.push(a.href)}
              disabled={!on}
              accessibilityRole="button"
              accessibilityState={{ disabled: !on }}
              accessibilityLabel={on ? `${a.title}. ${a.detail}` : `${a.title}, not available yet`}
              style={({ pressed }) => [styles.action, !on && styles.actionOff, pressed && styles.actionPressed]}
            >
              <View style={[styles.actionIcon, !on && { backgroundColor: colors.bg }]}>
                <Ionicons name={a.icon} size={28} color={on ? colors.primary : colors.muted} />
              </View>
              <Text style={[type.label, !on && { color: colors.muted }]}>{a.title}</Text>
              <Text style={styles.actionDetail} numberOfLines={2}>
                {on ? a.detail : 'Not available yet'}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {enabled.length === 0 ? (
        <Banner tone="info">The Society has not switched on transactions from the app yet. Until it does, visit a branch.</Banner>
      ) : null}

      <Heading>My requests</Heading>
      {requests.error ? (
        <Banner tone="danger">{requests.error instanceof ApiError ? requests.error.userMessage : 'Could not load your requests.'}</Banner>
      ) : null}
      {requests.isLoading ? <Loading /> : null}
      {requests.data && list.length === 0 ? (
        <Body muted>Nothing yet. What you ask for here appears in this list, with where each request stands.</Body>
      ) : null}
      {list.map(r => (
        <RequestCard key={r.id} request={r} />
      ))}
    </ScrollView>
  );
}

function RequestCard({ request: r }: { request: MemberRequest }) {
  return (
    <Card style={styles.request}>
      <View style={styles.requestHead}>
        <Ionicons name={KIND_ICON[r.kind]} size={22} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={type.label} numberOfLines={2}>
            {requestTitle(r)}
          </Text>
          <Text style={type.small}>
            {r.forMinor ? `${formatDate(r.createdAt)} · For ${r.forMinor}` : formatDate(r.createdAt)}
          </Text>
        </View>
        <Text style={styles.amount}>{formatMoney(r.amount)}</Text>
      </View>
      <View style={styles.statusRow}>
        <Badge tone={toneFor(r.state)}>{r.statusLabel}</Badge>
        {r.stage ? (
          <Text style={[type.small, { flex: 1 }]} numberOfLines={2}>
            {r.stage}
          </Text>
        ) : null}
      </View>
      {r.reason ? <Text style={styles.reason}>{r.reason}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionOff: { opacity: 0.6 },
  actionPressed: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionDetail: { fontSize: 12, color: colors.muted, textAlign: 'center' },
  request: { gap: spacing.sm, marginBottom: 0 },
  requestHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  amount: { ...type.subheading, color: colors.text },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reason: { fontSize: 13, color: colors.danger },
});
