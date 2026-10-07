import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_MODE } from '@/api';
import Constants from 'expo-constants';
import { formatBuild } from '@/lib/build';
import { useRootedDevice } from '@/lib/device';
import { Banner, Button } from '@/ui';
import { AnimatedLogo, FadeIn } from '@/ui/Logo';
import { colors, spacing } from '@/ui/theme';

export default function Welcome() {
  const router = useRouter();
  // Why the person is back here, when the app brought them rather than
  // they chose it.
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const rooted = useRootedDevice();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.hero}>
        <AnimatedLogo size={120} />
        <FadeIn delay={250}>
          <Text style={styles.title}>Al Barakah</Text>
          <Text style={styles.subtitle}>Multi-purpose Co-operative Society Ltd</Text>
        </FadeIn>
      </View>
      <FadeIn delay={400}>
        <View style={styles.actions}>
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
            {formatBuild(Constants.expoConfig?.version ?? '', API_MODE)}
          </Text>
        </View>
      </FadeIn>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.xl },
  title: { fontSize: 34, fontWeight: '700', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.8)', marginTop: spacing.xs, textAlign: 'center' },
  actions: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.xl,
    gap: spacing.md,
  },
  note: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: spacing.sm },
  build: { color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: spacing.xs },
});
