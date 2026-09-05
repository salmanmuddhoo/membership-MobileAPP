import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_MODE } from '@/api';
import { Button } from '@/ui';
import { colors, spacing } from '@/ui/theme';

export default function Welcome() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.hero}>
        <View style={styles.mark}>
          <Text style={styles.markText}>AB</Text>
        </View>
        <Text style={styles.title}>Al Barakah</Text>
        <Text style={styles.subtitle}>Multi-purpose Co-operative Society Ltd</Text>
      </View>
      <View style={styles.actions}>
        <Button title="I'm already a member" onPress={() => router.push('/(auth)/link')} />
        <Button title="Become a member" variant="secondary" onPress={() => router.push('/(auth)/sign-up')} />
        {API_MODE === 'mock' ? (
          <Text style={styles.note}>
            Demo mode. Member: NIC P1503881234567, AB0001 · New applicant: any mobile · Code: 123456
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  mark: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  markText: { fontSize: 34, fontWeight: '800', color: colors.primaryDark },
  title: { fontSize: 34, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.8)', marginTop: spacing.xs, textAlign: 'center' },
  actions: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.xl,
    gap: spacing.md,
  },
  note: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: spacing.sm },
});
