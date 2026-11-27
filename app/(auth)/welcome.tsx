import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_MODE } from '@/api';
import Constants from 'expo-constants';
import { formatBuild } from '@/lib/build';
import { useRootedDevice } from '@/lib/device';
import { Banner, Button } from '@/ui';
import { APP_VARIANT, TestBadge } from '@/ui/TestBadge';
import { AnimatedLogo, FadeIn } from '@/ui/Logo';
import { StarPattern } from '@/ui/Pattern';
import { colors, radius, spacing, type } from '@/ui/theme';

export default function Welcome() {
  const router = useRouter();
  // Why the person is back here, when the app brought them rather than
  // they chose it.
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const rooted = useRootedDevice();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <StarPattern scale={1.4} />
      <SafeAreaView style={styles.hero} edges={['top', 'left', 'right']}>
        <AnimatedLogo size={116} />
        <FadeIn delay={250}>
          <Text style={styles.since}>Since 1998</Text>
          <Text style={styles.title}>Al Barakah</Text>
          <Text style={styles.subtitle}>Multi-purpose Co-operative Society Ltd</Text>
          <View style={styles.badge}>
            <TestBadge />
          </View>
        </FadeIn>
      </SafeAreaView>
      <FadeIn delay={400}>
        <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Text style={styles.sheetTitle}>Welcome</Text>
          <Text style={[type.small, styles.sheetText]}>
            Your balances, your membership card and your requests to the Society, on your phone.
          </Text>
          {reason === 'pin_locked' ? (
            <Banner tone="warning" title="This phone was signed out">
              Too many wrong PINs. Link your membership again to get back in.
            </Banner>
          ) : null}
          {rooted ? (
            <Banner tone="warning" title="This phone appears to be rooted">
              A rooted phone can expose what the app keeps on it. Use the app on a phone you trust.
            </Banner>
          ) : null}
          <Button title="I'm already a member" onPress={() => router.push('/(auth)/link')} />
          <Button title="Become a member" variant="secondary" onPress={() => router.push('/(auth)/sign-up')} />
          {API_MODE === 'mock' ? (
            <Text style={styles.note}>
              Demo mode. Member: NIC P1503881234567, AB0001 · New applicant: any mobile · Code: 123456
            </Text>
          ) : null}
          {/* Which build this is. Quiet, and the first thing to check when a
              new APK seems not to have changed anything. */}
          <Text style={styles.build}>
            {formatBuild(Constants.expoConfig?.version ?? '', API_MODE, undefined, APP_VARIANT)}
          </Text>
        </View>
      </FadeIn>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.primaryDark, overflow: 'hidden' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.xl },
  since: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  title: { fontSize: 38, fontWeight: '800', letterSpacing: -0.8, color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 15, color: colors.onDarkMuted, marginTop: spacing.xs, textAlign: 'center' },
  badge: { marginTop: spacing.md },
  actions: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl + 4,
    borderTopRightRadius: radius.xl + 4,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl + 4,
    gap: spacing.md,
  },
  sheetTitle: { ...type.title },
  sheetText: { marginTop: -spacing.sm, marginBottom: spacing.sm },
  note: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: spacing.sm },
  build: { color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: spacing.xs },
});
