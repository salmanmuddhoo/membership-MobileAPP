// A balance that respects the "hide balances" switch, and the switch itself.
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { formatMoney } from '../lib/format';
import { useBalanceVisibility } from '../store/balances';
import { colors, spacing } from './theme';

export const MASKED = 'Rs ••••••';

export function Balance({ amount, style }: { amount: string | null; style?: StyleProp<TextStyle> }) {
  const { hidden } = useBalanceVisibility();
  return (
    <Text style={style} accessibilityLabel={hidden ? 'Balance hidden' : undefined}>
      {hidden ? MASKED : formatMoney(amount)}
    </Text>
  );
}

export function BalanceToggle({ color = colors.primary, label = true }: { color?: string; label?: boolean }) {
  const { hidden, toggle } = useBalanceVisibility();
  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={hidden ? 'Show balances' : 'Hide balances'}
      hitSlop={12}
      style={({ pressed }) => [styles.toggle, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={color} />
      {label ? <Text style={[styles.label, { color }]}>{hidden ? 'Show' : 'Hide'}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs },
  label: { fontSize: 14, fontWeight: '600' },
});
