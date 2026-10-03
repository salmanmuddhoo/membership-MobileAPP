// Moving money from the app: deposits, withdrawals and transfers. The
// backend already defines what a member may start (Configuration → Member
// app); the screens that do it come next. Until then this is the menu, so
// members know where it will be.
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge, Body, Card } from '@/ui';
import { colors, spacing, type } from '@/ui/theme';

const ACTIONS: { title: string; detail: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { title: 'Deposit', detail: 'Pay into one of your accounts.', icon: 'arrow-down-circle-outline' },
  { title: 'Withdrawal', detail: 'Ask for money from one of your accounts.', icon: 'arrow-up-circle-outline' },
  { title: 'Transfer', detail: 'Move money between accounts.', icon: 'swap-horizontal-outline' },
];

export default function Transact() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Body muted>
        Moving money from the app is on its way. Until then, visit a branch for any of these.
      </Body>
      {ACTIONS.map(a => (
        <Card key={a.title} style={styles.row}>
          <View style={styles.icon}>
            <Ionicons name={a.icon} size={26} color={colors.muted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[type.subheading, { color: colors.muted }]}>{a.title}</Text>
            <Text style={type.small}>{a.detail}</Text>
          </View>
          <Badge tone="info">Coming soon</Badge>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
