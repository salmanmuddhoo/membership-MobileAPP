// The membership card: the physical card every member carries, on the
// phone. Name, Member No. and a barcode — the number is what the card is;
// the barcode is what partner outlets will scan for a member's discount
// once the Society settles its format (ui/Barcode is a placeholder until
// then).
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { useMe } from '@/hooks/queries';
import { Body, Card, Empty, Loading } from '@/ui';
import { Barcode } from '@/ui/Barcode';
import { Logo } from '@/ui/Logo';
import { colors, radius, spacing, type } from '@/ui/theme';

// ISO/IEC 7810 ID-1: the proportions of a bank card.
const CARD_RATIO = 85.6 / 53.98;

export default function MembershipCard() {
  const { session } = useAuth();
  const me = useMe();
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
      <Body muted>
        Show this card at partner outlets to receive member discounts as the Society announces them.
      </Body>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
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
  hint: { ...type.small },
});
