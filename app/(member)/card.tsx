// The membership card: the physical card every member carries, on the
// phone — name, Member No. and a barcode — and beneath it the partner
// outlets where it earns a discount, by category.
//
// The barcode is a placeholder pattern until the Society settles the
// symbology its partner outlets will scan (lib/barcode.ts).
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApiError, type Outlet } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { useMe, useOutlets } from '@/hooks/queries';
import { categoriesOf, categoryLabel, discountLabel } from '@/lib/outlets';
import { Banner, Body, Card, Empty, Heading, Loading } from '@/ui';
import { Barcode } from '@/ui/Barcode';
import { EmbossedText } from '@/ui/Embossed';
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
      <LinearGradient
        colors={['#146A57', '#0B443A', '#062A24']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
        accessibilityLabel={`Al Barakah membership card, ${name}, member number ${profile.memberNo}`}
      >
        {/* The light across the face: a band of it, as on a laminated card. */}
        <View style={styles.sheenBand} />
        <View style={styles.sheenSpot} />

        <View style={styles.cardHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.brand}>AL BARAKAH</Text>
            <Text style={styles.brandSub}>Multi-purpose Co-operative Society Ltd</Text>
          </View>
          <Logo size={40} />
        </View>

        <View style={styles.cardChipRow}>
          <Chip />
          <MaterialCommunityIcons name="contactless-payment" size={26} color="rgba(255,255,255,0.75)" />
        </View>

        <View style={{ flex: 1 }} />

        <EmbossedText size={nameSize(profile.memberNo, 22)} letterSpacing={3} style={styles.number}>
          {profile.memberNo}
        </EmbossedText>

        <View style={styles.cardFoot}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>MEMBER</Text>
            <EmbossedText size={nameSize(name, 17)} letterSpacing={1.5}>
              {name}
            </EmbossedText>
          </View>
          {since ? (
            <View style={styles.since}>
              <Text style={styles.fieldLabel}>SINCE</Text>
              <EmbossedText size={15} letterSpacing={1}>
                {String(since)}
              </EmbossedText>
            </View>
          ) : null}
        </View>
      </LinearGradient>

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
          <FilterChip label="All" selected={category === null} onPress={() => setCategory(null)} />
          {categories.map(c => (
            <FilterChip key={c} label={categoryLabel(c)} selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </ScrollView>
      ) : null}

      {shown.map(o => (
        <OutletCard key={o.id} outlet={o} />
      ))}
    </ScrollView>
  );
}

// Embossed lettering cannot shrink to fit (three copies would each shrink
// differently), so the size is chosen from the length instead.
function nameSize(text: string, full: number): number {
  if (text.length <= 16) return full;
  if (text.length <= 22) return full - 3;
  return full - 6;
}

// The contact plate, in gold, with the lines a real one has.
function Chip() {
  return (
    <LinearGradient colors={['#F1D98A', '#C8A24C', '#A47F2C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardChip}>
      <View style={styles.chipLineH} />
      <View style={[styles.chipLineH, { top: '66%' }]} />
      <View style={styles.chipLineV} />
      <View style={[styles.chipLineV, { left: '66%' }]} />
    </LinearGradient>
  );
}

function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
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
    padding: spacing.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  sheenBand: {
    position: 'absolute',
    left: '30%',
    top: -200,
    width: 140,
    height: 600,
    backgroundColor: 'rgba(255,255,255,0.06)',
    transform: [{ rotate: '28deg' }],
  },
  sheenSpot: {
    position: 'absolute',
    right: -90,
    bottom: -150,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(200,162,76,0.14)',
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  brand: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 2.5 },
  brandSub: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 2 },
  cardChipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  cardChip: {
    width: 44,
    height: 33,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.25)',
    overflow: 'hidden',
  },
  chipLineH: { position: 'absolute', left: 0, right: 0, top: '33%', height: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  chipLineV: { position: 'absolute', top: 0, bottom: 0, left: '33%', width: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  number: { marginBottom: spacing.md },
  cardFoot: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  since: { alignItems: 'flex-end' },
  fieldLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 8, letterSpacing: 1.5, marginBottom: 3 },
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
