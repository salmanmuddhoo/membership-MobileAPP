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
import { Badge, Banner, Body, Card, Eyebrow, Loading } from '@/ui';
import { GlassSheen } from '@/ui/Glass';
import { colors, glass, radius, shadow, spacing, type } from '@/ui/theme';

const ACTIONS: {
  op: MemberOperation;
  title: string;
  detail: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  href: '/transact/deposit' | '/transact/withdrawal' | '/transact/transfer';
}[] = [
  { op: 'deposit', title: 'Deposit', detail: 'Tell us about money you paid in', icon: 'arrow-down', href: '/transact/deposit' },
  { op: 'withdrawal', title: 'Withdraw', detail: 'Ask for money out', icon: 'arrow-up', href: '/transact/withdrawal' },
  { op: 'transfer', title: 'Transfer', detail: 'Between your accounts', icon: 'swap-horizontal', href: '/transact/transfer' },
];

const KIND_ICON: Record<MemberOperation, React.ComponentProps<typeof Ionicons>['name']> = {
  deposit: 'arrow-down',
  withdrawal: 'arrow-up',
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
              <View style={[styles.actionIcon, !on && styles.actionIconOff]}>
                {on ? <GlassSheen radius={18} intensity={0.13} /> : null}
                <Ionicons name={a.icon} size={24} color={on ? '#fff' : colors.subtle} />
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

      <Eyebrow style={styles.eyebrow}>My requests</Eyebrow>
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
        <View style={styles.requestIcon}>
          <Ionicons name={KIND_ICON[r.kind]} size={18} color={colors.primary} />
        </View>
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  actionOff: { opacity: 0.6 },
  actionPressed: { transform: [{ scale: 0.97 }], backgroundColor: colors.primarySoft },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    marginBottom: spacing.xs,
    ...glass.emerald,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconOff: { ...glass.frost, boxShadow: 'none' },
  actionDetail: { fontSize: 12, color: colors.muted, textAlign: 'center' },
  eyebrow: { marginTop: spacing.lg, marginBottom: 0 },
  requestIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  request: { gap: spacing.sm, marginBottom: 0 },
  requestHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  amount: { ...type.subheading, color: colors.text },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reason: { fontSize: 13, color: colors.danger },
});
