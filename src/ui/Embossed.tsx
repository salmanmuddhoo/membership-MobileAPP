// Raised lettering, the way a name and number stand off a bank card: a
// highlight up and to the left of each stroke, a shadow down and to the
// right, and a brushed-silver face between them. Three copies of the same
// text, stacked — no library, nothing a low-end phone cannot draw.
import React from 'react';
import { Platform, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

// Android's monospace and iOS's Courier are both close enough to the OCR-B
// of a real card, and both ship on every phone.
export const CARD_FONT = Platform.select({ ios: 'Courier New', default: 'monospace' });

export function EmbossedText({
  children,
  size = 18,
  letterSpacing = 2,
  mono = true,
  style,
}: {
  children: string;
  size?: number;
  letterSpacing?: number;
  mono?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const base: TextStyle = {
    fontSize: size,
    letterSpacing,
    fontWeight: mono ? '700' : '600',
    fontFamily: mono ? CARD_FONT : undefined,
    includeFontPadding: false,
  };
  return (
    <View style={style}>
      <Text style={[base, styles.shadow]} numberOfLines={1} accessible={false}>
        {children}
      </Text>
      <Text style={[base, styles.highlight]} numberOfLines={1} accessible={false}>
        {children}
      </Text>
      <Text style={[base, styles.face]} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Both offsets are a whole pixel or more: a fraction blurs instead of
  // reading as an edge.
  shadow: { position: 'absolute', left: 1.5, top: 1.5, color: 'rgba(0,0,0,0.6)' },
  highlight: { position: 'absolute', left: -1, top: -1, color: 'rgba(255,255,255,0.45)' },
  face: {
    color: '#D7DCD9',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});
