// The barcode on the membership card, drawn from lib/barcode (a placeholder
// pattern until the Society chooses a symbology — see there).
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { barsFor } from '../lib/barcode';
import { colors, spacing } from './theme';

export function Barcode({ value, height = 64 }: { value: string; height?: number }) {
  const bars = barsFor(value);
  return (
    <View style={styles.wrap} accessibilityLabel={`Barcode ${value}`}>
      <View style={[styles.bars, { height }]}>
        {bars.map((w, i) => (
          <View key={i} style={{ flex: w, backgroundColor: i % 2 === 0 ? colors.text : 'transparent' }} />
        ))}
      </View>
      <Text style={styles.text}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'stretch', gap: spacing.sm },
  bars: { flexDirection: 'row', width: '100%' },
  text: { textAlign: 'center', fontSize: 14, letterSpacing: 4, color: colors.text, fontVariant: ['tabular-nums'] },
});
