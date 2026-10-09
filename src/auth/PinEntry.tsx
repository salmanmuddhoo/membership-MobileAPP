// A dot per digit and a keypad: the one control both the set-up and the
// unlock are built from. Controlled: the caller holds the digits, so it can
// empty them after a wrong PIN, and sees the last digit land. Four digits,
// or the stored PIN's own length when an old six-digit one unlocks.
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../ui/theme';
import { PIN_LENGTH } from './pin';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'] as const;

export function PinEntry({
  digits,
  onChange,
  disabled,
  length = PIN_LENGTH,
}: {
  digits: string;
  onChange: (digits: string) => void;
  disabled?: boolean;
  length?: number;
}) {
  function press(key: string) {
    if (disabled) return;
    Haptics.selectionAsync().catch(() => undefined);
    if (key === 'back') onChange(digits.slice(0, -1));
    else if (digits.length < length) onChange(digits + key);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.dots} accessibilityLabel={`${digits.length} of ${length} digits entered`}>
        {Array.from({ length }, (_, i) => (
          <View key={i} style={[styles.dot, i < digits.length && styles.dotFilled]} />
        ))}
      </View>
      <View style={styles.pad}>
        {KEYS.map((key, i) =>
          key === '' ? (
            <View key={i} style={styles.key} />
          ) : (
            <Pressable
              key={key}
              onPress={() => press(key)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={key === 'back' ? 'Delete' : key}
              style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
            >
              {key === 'back' ? (
                <Ionicons name="backspace-outline" size={28} color="#fff" />
              ) : (
                <Text style={styles.keyText}>{key}</Text>
              )}
            </Pressable>
          )
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.xl },
  dots: { flexDirection: 'row', gap: spacing.lg },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  dotFilled: { backgroundColor: colors.accent, borderColor: colors.accent },
  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 3 * 72 + 2 * spacing.lg,
    gap: spacing.lg,
    justifyContent: 'center',
  },
  key: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  keyPressed: { backgroundColor: 'rgba(255,255,255,0.3)' },
  keyText: { fontSize: 28, fontWeight: '600', color: '#fff' },
});
