// The landing page: the member's money in one figure, what the Society is
// promoting, and its partners — the outlets that pay the premium fee
// (officer direction — a promotional page, not a second menu).
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApiError, type Outlet } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { useAccounts, useApplications, useMe, useOutlets, usePromotions } from '@/hooks/queries';
import { useRootedDevice } from '@/lib/device';
import { formatDate, statusLabel } from '@/lib/format';
import { sumMoney } from '@/lib/money';
import { discountLabel } from '@/lib/outlets';
import { Banner, Body, Button, Card, Heading, Spacer } from '@/ui';
import { Balance, BalanceToggle } from '@/ui/Balance';
import { PromotionCarousel, showablePromotions } from '@/ui/Carousel';
import { colors, radius, spacing, type } from '@/ui/theme';

export default function Home() {
  const router = useRouter();
  const { session } = useAuth();
  const me = useMe();
  const accounts = useAccounts();
  const applications = useApplications();
  const promotions = usePromotions();
  const outlets = useOutlets();
  const rooted = useRootedDevice();

  const refreshing = me.isRefetching || accounts.isRefetching;
  const refresh = () => {
    me.refetch();
    accounts.refetch();
    applications.refetch();
    promotions.refetch();
    outlets.refetch();
  };

  const profile = me.data;
  const isMember = profile?.kind === 'member';
  const hasAccounts = profile?.kind === 'member' || profile?.kind === 'customer';
  const openApplication = applications.data?.find(a => !['approved', 'rejected'].includes(a.status));
  const problem = me.error instanceof ApiError ? me.error.userMessage : null;
  const total = accounts.data ? sumMoney(accounts.data.map(a => a.balance)) : null;
  const cards = promotions.data ? showablePromotions(promotions.data) : [];

  const partners = (outlets.data ?? []).filter(o => o.isPartner);

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
        </View>
      ) : (
        <Spacer />
      )}
      {problem ? <Banner tone="danger">{problem}</Banner> : null}
      {rooted ? (
        <Banner tone="warning" title="This phone appears to be rooted">
          A rooted phone can expose what the app keeps on it. Use the app on a phone you trust.
        </Banner>
      ) : null}

      {hasAccounts ? (
        <Pressable
          onPress={() => router.push('/(member)/accounts')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.total, pressed && { opacity: 0.9 }]}
        >
          <View style={styles.totalHead}>
            <Text style={styles.totalLabel}>Total balance</Text>
            <BalanceToggle color="rgba(255,255,255,0.9)" />
          </View>
          <Balance amount={accounts.data ? total : null} style={styles.totalValue} />
          <Text style={styles.totalHint}>
            {accounts.data
              ? `Across ${accounts.data.length} account${accounts.data.length === 1 ? '' : 's'}`
              : 'Loading…'}
          </Text>
        </Pressable>
      ) : null}

      <PromotionCarousel items={cards} />

      {profile?.pendingUpdate ? (
        <Banner tone="info" title="Details update pending">
          Sent {formatDate(profile.pendingUpdate.submittedAt)}. Staff will verify it before your record changes.
        </Banner>
      ) : profile?.lastUpdate?.status === 'declined' ? (
        <Banner tone="warning" title="Your details update was not applied">
          {profile.lastUpdate.comment ?? 'Visit a branch with your ID.'}
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

      {partners.length > 0 ? (
        <>
          <Heading>Our partners</Heading>
          <Body muted>Show your membership card at these outlets for the discount.</Body>
          <Spacer size="sm" />
          <View style={styles.partners}>
            {partners.map(o => (
              <PartnerTile key={o.id} outlet={o} onPress={() => openPartner(o, () => router.push('/(member)/card'))} />
            ))}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

// A partner's link if it has one; otherwise the Cards screen, where the
// outlet is listed with its address and terms.
function openPartner(outlet: Outlet, fallback: () => void) {
  if (outlet.linkUrl) Linking.openURL(outlet.linkUrl).catch(fallback);
  else fallback();
}

function PartnerTile({ outlet, onPress }: { outlet: Outlet; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${outlet.name}, ${discountLabel(outlet.discountPercent)}`}
      style={({ pressed }) => [styles.partner, pressed && styles.partnerPressed]}
    >
      <View style={styles.partnerLogo}>
        <Image source={{ uri: outlet.logoUrl }} style={styles.partnerImage} resizeMode="contain" />
      </View>
      <Text style={styles.partnerName} numberOfLines={1}>
        {outlet.name}
      </Text>
      <Text style={styles.partnerDiscount}>{discountLabel(outlet.discountPercent)}</Text>
    </Pressable>
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
  total: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  totalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600' },
  totalValue: { color: '#fff', fontSize: 32, fontWeight: '700', marginTop: spacing.xs },
  totalHint: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: spacing.xs },
  partners: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  partner: {
    width: '30%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  partnerPressed: { backgroundColor: colors.primarySoft },
  partnerLogo: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  partnerImage: { width: 48, height: 48 },
  partnerName: { ...type.label, textAlign: 'center' },
  partnerDiscount: { fontSize: 12, fontWeight: '700', color: colors.primary },
});
