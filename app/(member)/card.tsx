// The membership card: the physical card every member carries, on the
// phone — name, Member No. and a barcode — and beneath it the partner
// outlets where it earns a discount, by category.
//
// The barcode is a placeholder pattern until the Society settles the
// symbology its partner outlets will scan (lib/barcode.ts).
import React, { useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApiError, type Outlet } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { useMe, useOutlets } from '@/hooks/queries';
import { categoriesOf, categoryLabel, discountLabel } from '@/lib/outlets';
import { Banner, Body, Card, Empty, Heading, Loading } from '@/ui';
import { Barcode } from '@/ui/Barcode';
import { Logo } from '@/ui/Logo';
import { colors, radius, spacing, type } from '@/ui/theme';

// ISO/IEC 7810 ID-1: the proportions of a bank card.
const CARD_RATIO = 85.6 / 53.98;

export default function MembershipCard() {
  const { session } = useAuth();
  const me = useMe();
  const outlets = useOutlets();
  const [category, setCategory] = useState<string | null>(null);

  if (me.isLoading) return <Loading />;
  const profile = me.data;
  if (!profile || profile.kind !== 'member' || !profile.memberNo) {
    return (
      <Empty title="No card yet">
        Your Al Barakah membership card appears here once your membership is approved.
      </Empty>
    );
  }
  const name = (session?.identity.displayName ?? '').toUpperCase();
  const since = profile.joinedAt ? new Date(profile.joinedAt).getFullYear() : null;

  const all = outlets.data ?? [];
  const categories = categoriesOf(all);
  const shown = category ? all.filter(o => o.category === category) : all;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card} accessibilityLabel={`Al Barakah membership card, ${name}, member number ${profile.memberNo}`}>
        <View style={styles.sheen} />
        <View style={styles.sheenSmall} />
        <View style={styles.cardHead}>
          <Logo size={44} />
          <View style={{ flex: 1 }}>
            <Text style={styles.brand}>Al Barakah</Text>
            <Text style={styles.brandSub}>Multi-purpose Co-operative Society Ltd</Text>
          </View>
        </View>
        <View style={{ flex: 1 }} />
        <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit>
          {name}
        </Text>
        <View style={styles.cardFoot}>
          <View>
            <Text style={styles.fieldLabel}>MEMBER NO.</Text>
            <Text style={styles.fieldValue}>{profile.memberNo}</Text>
          </View>
          {since ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.fieldLabel}>MEMBER SINCE</Text>
              <Text style={styles.fieldValue}>{since}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <Card style={styles.barcode}>
        <Barcode value={profile.memberNo} />
      </Card>

      <Heading>Where to use your card</Heading>
      {outlets.isLoading ? <Loading /> : null}
      {outlets.error ? (
        <Banner tone="danger">{outlets.error instanceof ApiError ? outlets.error.userMessage : 'Could not load.'}</Banner>
      ) : null}
      {outlets.data && all.length === 0 ? (
        <Body muted>Partner outlets will be listed here as the Society signs them up. Show your card there for the discount.</Body>
      ) : null}

      {categories.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips} contentContainerStyle={styles.chipRow}>
          <Chip label="All" selected={category === null} onPress={() => setCategory(null)} />
          {categories.map(c => (
            <Chip key={c} label={categoryLabel(c)} selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </ScrollView>
      ) : null}

      {shown.map(o => (
        <OutletCard key={o.id} outlet={o} />
      ))}
    </ScrollView>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && { opacity: 0.8 }]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function OutletCard({ outlet }: { outlet: Outlet }) {
  const open = outlet.linkUrl ? () => Linking.openURL(outlet.linkUrl!).catch(() => undefined) : undefined;
  return (
    <Card onPress={open} style={styles.outlet}>
      <View style={styles.outletRow}>
        <View style={styles.logoTile}>
          <Image source={{ uri: outlet.logoUrl }} style={styles.logo} resizeMode="contain" accessibilityLabel={`${outlet.name} logo`} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={type.subheading} numberOfLines={1}>
            {outlet.name}
          </Text>
          <View style={styles.tagRow}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{categoryLabel(outlet.category)}</Text>
            </View>
            {outlet.address ? (
              <Text style={type.small} numberOfLines={1}>
                {outlet.address}
              </Text>
            ) : null}
          </View>
          {outlet.description ? (
            <Text style={[type.small, { marginTop: spacing.xs }]} numberOfLines={2}>
              {outlet.description}
            </Text>
          ) : null}
        </View>
        <View style={styles.discount}>
          <Text style={styles.discountText}>{discountLabel(outlet.discountPercent)}</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  card: {
    aspectRatio: CARD_RATIO,
    width: '100%',
    borderRadius: radius.lg,
    backgroundColor: colors.primaryDark,
    padding: spacing.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  sheen: {
    position: 'absolute',
    right: -80,
    top: -120,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  sheenSmall: {
    position: 'absolute',
    left: -60,
    bottom: -140,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(200,162,76,0.18)',
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  brand: { color: '#fff', fontSize: 18, fontWeight: '700' },
  brandSub: { color: 'rgba(255,255,255,0.75)', fontSize: 11 },
  name: { color: '#fff', fontSize: 18, fontWeight: '600', letterSpacing: 2, marginBottom: spacing.md },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  fieldLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 9, letterSpacing: 1.5 },
  fieldValue: { color: colors.accent, fontSize: 18, fontWeight: '700', letterSpacing: 2, marginTop: 2 },
  barcode: { paddingVertical: spacing.lg },
  chips: { marginHorizontal: -spacing.lg },
  chipRow: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...type.label, color: colors.text },
  chipTextSelected: { color: '#fff' },
  outlet: { marginBottom: 0 },
  outletRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logoTile: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: { width: 48, height: 48 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2, flexWrap: 'wrap' },
  tag: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  tagText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  discount: { backgroundColor: colors.accent, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  discountText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
});
