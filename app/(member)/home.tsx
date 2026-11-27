// The landing page. On the brand's emerald: who is signed in and their
// money in one figure, on a card that overlaps the header. Beneath it,
// the three ways to move money, what the Society is promoting, and its
// partners — the outlets that pay the premium fee (officer direction — a
// promotional page, not a second menu).
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import { Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError, type MemberOperation, type Outlet } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { useAccounts, useApplications, useMe, useOutlets, usePromotions, useReference } from '@/hooks/queries';
import { useRootedDevice } from '@/lib/device';
import { formatDate, statusLabel } from '@/lib/format';
import { sumMoney } from '@/lib/money';
import { givenNames, initials } from '@/lib/names';
import { OFFICE_PHONE, OFFICE_PHONE_URL } from '@/lib/office';
import { discountLabel } from '@/lib/outlets';
import { Banner, Button, Eyebrow } from '@/ui';
import { Balance, BalanceToggle } from '@/ui/Balance';
import { PromotionCarousel, showablePromotions } from '@/ui/Carousel';
import { GlassSheen } from '@/ui/Glass';
import { StarPattern } from '@/ui/Pattern';
import { TestBadge } from '@/ui/TestBadge';
import { colors, glass, radius, shadow, spacing, type } from '@/ui/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// The three ways to move money, and nothing else: the tab bar already
// leads to the accounts, the card and the details. Each is shown greyed
// out until the Society switches it on.
const QUICK_ACTIONS: { op: MemberOperation; label: string; icon: IconName; href: Href }[] = [
  { op: 'deposit', label: 'Deposit', icon: 'arrow-down', href: '/transact/deposit' },
  { op: 'withdrawal', label: 'Withdraw', icon: 'arrow-up', href: '/transact/withdrawal' },
  { op: 'transfer', label: 'Transfer', icon: 'swap-horizontal', href: '/transact/transfer' },
];

// How far the balance card reaches up into the emerald header.
const OVERLAP = 64;

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const me = useMe();
  const accounts = useAccounts();
  const applications = useApplications();
  const promotions = usePromotions();
  const outlets = useOutlets();
  const reference = useReference();
  const rooted = useRootedDevice();

  // White status bar text over the emerald, only while this tab is the
  // one showing; every other screen has a light header.
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );

  const refreshing = me.isRefetching || accounts.isRefetching;
  const refresh = () => {
    me.refetch();
    accounts.refetch();
    applications.refetch();
    promotions.refetch();
    outlets.refetch();
    reference.refetch();
  };

  const profile = me.data;
  const kind = profile?.kind ?? session?.identity.kind;
  const isMember = kind === 'member';
  const hasAccounts = kind === 'member' || kind === 'customer';
  const openApplication = applications.data?.find(a => !['approved', 'rejected'].includes(a.status));
  const problem = me.error instanceof ApiError ? me.error.userMessage : null;
  const total = accounts.data ? sumMoney(accounts.data.map(a => a.balance)) : null;
  const cards = promotions.data ? showablePromotions(promotions.data) : [];
  const partners = (outlets.data ?? []).filter(o => o.isPartner);
  const enabled = reference.data?.enabledOperations ?? [];

  const displayName = session?.identity.displayName ?? '';
  const since = profile?.joinedAt ? new Date(profile.joinedAt).getFullYear() : null;
  const showOverlapCard = hasAccounts || (!isMember && !me.isLoading);

  return (
    <View style={styles.screen}>
      {focused ? <StatusBar style="light" /> : null}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#fff" colors={[colors.primary]} />
        }
      >
        {/* Pulled past the top, the page shows more emerald, not a white gap. */}
        <View style={styles.overscroll} />

        <View
          style={[
            styles.hero,
            { paddingTop: insets.top + spacing.lg, paddingBottom: showOverlapCard ? OVERLAP + spacing.xl : spacing.xl },
          ]}
        >
          <StarPattern />
          <View style={styles.heroTop}>
            <Pressable
              onPress={() => router.push('/(member)/profile')}
              accessibilityRole="button"
              accessibilityLabel="My details"
              style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
            >
              <Text style={styles.avatarText}>{initials(displayName) || 'AB'}</Text>
            </Pressable>
            <View style={styles.greetingBlock}>
              <Text style={styles.greeting}>Assalamu alaikum,</Text>
              <Text style={styles.name} numberOfLines={2}>
                {givenNames(profile, displayName) || 'Member'}
              </Text>
            </View>
            <TestBadge />
            <Pressable
              onPress={() => Linking.openURL(OFFICE_PHONE_URL).catch(() => undefined)}
              accessibilityRole="button"
              accessibilityLabel={`Call the office on ${OFFICE_PHONE}`}
              hitSlop={8}
              style={({ pressed }) => [styles.heroIcon, pressed && styles.pressed]}
            >
              <GlassSheen radius={21} intensity={0.1} />
              <Ionicons name="call-outline" size={20} color="#fff" />
            </Pressable>
          </View>
          {isMember && profile?.memberNo ? (
            <View style={styles.memberChip}>
              <Ionicons name="ribbon-outline" size={14} color={colors.accent} />
              <Text style={styles.memberChipText}>
                Member {profile.memberNo}
                {since ? ` · since ${since}` : ''}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.body}>
          {hasAccounts ? (
            <View style={styles.balanceCard}>
              <View style={styles.balanceHead}>
                <Text style={type.eyebrow}>Total balance</Text>
                <BalanceToggle color={colors.muted} label={false} />
              </View>
              <Balance amount={accounts.data ? total : null} style={styles.balanceValue} />
              <View style={styles.balanceFoot}>
                <Pressable
                  onPress={() => router.push('/(member)/accounts')}
                  accessibilityRole="button"
                  hitSlop={8}
                  style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
                >
                  <Text style={styles.link}>View accounts</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                </Pressable>
              </View>
            </View>
          ) : !isMember && !me.isLoading ? (
            <View style={styles.balanceCard}>
              <Text style={type.eyebrow}>Membership</Text>
              <Text style={styles.applyTitle}>Not a member yet</Text>
              <Text style={[type.small, styles.applyText]}>
                {openApplication
                  ? `Your application ${openApplication.reference} is ${statusLabel(openApplication.status).toLowerCase()}.`
                  : 'Apply on your phone in a few minutes. You will need your NIC and a proof of address.'}
              </Text>
              <Button
                title={openApplication ? 'Continue application' : 'Apply to become a member'}
                onPress={() =>
                  openApplication
                    ? router.push({ pathname: '/(apply)/[id]/form', params: { id: openApplication.id, step: '0' } })
                    : router.push('/(apply)')
                }
              />
            </View>
          ) : null}

          <View style={styles.notices}>
            {problem ? <Banner tone="danger">{problem}</Banner> : null}
            {rooted ? (
              <Banner tone="warning" title="This phone appears to be rooted">
                A rooted phone can expose what the app keeps on it. Use the app on a phone you trust.
              </Banner>
            ) : null}
            {profile?.pendingUpdate ? (
              <Banner tone="info" title="Details update pending">
                Sent {formatDate(profile.pendingUpdate.submittedAt)}. Staff will verify it before your record changes.
              </Banner>
            ) : profile?.lastUpdate?.status === 'declined' ? (
              <Banner tone="warning" title="Your details update was not applied">
                {profile.lastUpdate.comment ?? 'Visit a branch with your ID.'}
              </Banner>
            ) : null}
          </View>

          {hasAccounts ? (
            <>
              <Eyebrow>Quick actions</Eyebrow>
              <View style={styles.grid}>
                {QUICK_ACTIONS.map(a => {
                  const on = enabled.includes(a.op);
                  return (
                    <Pressable
                      key={a.op}
                      onPress={() => router.push(a.href)}
                      disabled={!on}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: !on }}
                      accessibilityLabel={on ? a.label : `${a.label}, not available yet`}
                      style={({ pressed }) => [styles.action, pressed && styles.pressed]}
                    >
                      <View style={[styles.actionTile, !on && styles.actionTileOff]}>
                        {on ? <GlassSheen radius={20} intensity={0.13} /> : null}
                        <Ionicons name={a.icon} size={24} color={on ? '#fff' : colors.subtle} />
                      </View>
                      <Text style={[styles.actionLabel, !on && { color: colors.subtle }]} numberOfLines={1}>
                        {a.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          {cards.length > 0 ? (
            <>
              <Eyebrow>What&apos;s new</Eyebrow>
              <PromotionCarousel items={cards} />
            </>
          ) : null}

          {partners.length > 0 ? (
            <>
              <Eyebrow>Our partners</Eyebrow>
              {isMember ? (
                <Pressable
                  onPress={() => router.push('/(member)/card')}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.partnerBanner, pressed && styles.pressed]}
                >
                  <StarPattern scale={0.45} stroke={1} />
                  <View style={styles.partnerBannerIcon}>
                    <Ionicons name="gift-outline" size={22} color={colors.primaryDeep} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.partnerBannerTitle}>Partner discounts</Text>
                    <Text style={styles.partnerBannerText}>
                      Show your membership card at {partners.length} outlet{partners.length === 1 ? '' : 's'}
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </Pressable>
              ) : null}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.partnerStrip}
                contentContainerStyle={styles.partnerStripContent}
              >
                {partners.map(o => (
                  <PartnerTile key={o.id} outlet={o} onPress={() => openPartner(o, () => router.push('/(member)/card'))} />
                ))}
              </ScrollView>
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

// A partner's link if it has one; otherwise the Cards screen, where the
// outlet is listed with its address and terms.
function openPartner(outlet: Outlet, fallback: () => void) {
  if (outlet.linkUrl) Linking.openURL(outlet.linkUrl).catch(fallback);
  else fallback();
}

// The partner's logo is the tile: the picture fills it edge to edge, with
// the name and the discount in a strip beneath (officer direction — the
// earlier tile was mostly margin around a small logo).
function PartnerTile({ outlet, onPress }: { outlet: Outlet; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${outlet.name}, ${discountLabel(outlet.discountPercent)}`}
      style={({ pressed }) => [styles.partner, pressed && styles.pressed]}
    >
      <View style={styles.partnerLogo}>
        <Image source={{ uri: outlet.logoUrl }} style={styles.partnerImage} resizeMode="contain" />
        <View style={styles.partnerDiscount}>
          <Text style={styles.partnerDiscountText}>{discountLabel(outlet.discountPercent)}</Text>
        </View>
      </View>
      <Text style={styles.partnerName} numberOfLines={1}>
        {outlet.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: spacing.xxl },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  overscroll: {
    position: 'absolute',
    top: -1000,
    left: 0,
    right: 0,
    height: 1000,
    backgroundColor: colors.primaryDark,
  },

  hero: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.lg + 4,
    overflow: 'hidden',
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarText: { color: colors.primaryDeep, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  greetingBlock: { flex: 1 },
  greeting: { color: colors.onDarkMuted, fontSize: 14 },
  name: { color: colors.onDark, fontSize: 22, fontWeight: '800', letterSpacing: -0.3, marginTop: 1 },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    ...glass.onDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    ...glass.onDark,
    borderColor: 'rgba(200,162,76,0.35)',
    borderTopColor: 'rgba(226,194,115,0.6)',
  },
  memberChipText: { color: colors.onDark, fontSize: 13, fontWeight: '600', letterSpacing: 0.2 },

  body: { paddingHorizontal: spacing.lg },
  balanceCard: {
    marginTop: -OVERLAP,
    backgroundColor: colors.surface,
    borderRadius: radius.xl - 4,
    padding: spacing.xl - 2,
    ...shadow.raised,
  },
  balanceHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  balanceValue: { ...type.display, marginTop: spacing.sm, fontVariant: ['tabular-nums'] },
  balanceFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  link: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  applyTitle: { ...type.heading, marginTop: spacing.sm },
  applyText: { marginTop: spacing.xs, marginBottom: spacing.lg },

  notices: { gap: 0, paddingTop: spacing.sm },

  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.lg },
  action: { width: '33.333%', alignItems: 'center', gap: spacing.sm },
  actionTile: {
    width: 60,
    height: 60,
    borderRadius: 20,
    ...glass.emerald,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTileOff: { ...glass.frost, boxShadow: 'none' },
  actionLabel: { fontSize: 13, fontWeight: '600', color: colors.text },

  partnerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    overflow: 'hidden',
  },
  partnerBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerBannerTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  partnerBannerText: { color: colors.onDarkMuted, fontSize: 13, marginTop: 2 },
  partnerStrip: { marginHorizontal: -spacing.lg, marginTop: spacing.md },
  partnerStripContent: { paddingHorizontal: spacing.lg, gap: spacing.md },
  partner: { width: 132 },
  partnerLogo: {
    width: 132,
    height: 100,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    ...shadow.card,
  },
  partnerImage: { width: '100%', height: '100%' },
  partnerDiscount: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  partnerDiscountText: { fontSize: 11, fontWeight: '800', color: colors.accentInk },
  partnerName: { ...type.label, fontSize: 13, marginTop: spacing.sm },
});
