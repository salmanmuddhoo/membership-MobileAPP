// Gold lettering standing off the card, the way the reference card the
// Society chose has it: a polished gold face, lit from above, on a block
// of darker gold that steps down and to the right behind it, with a thin
// bright rim along the top edge and a soft shadow underneath.
//
// The face is a gradient seen through the letters (MaskedView over
// LinearGradient); the depth is copies of the same text, each a pixel
// lower and a shade darker. No images, no fonts to ship: it scales with
// the text and draws on any phone. On the web, where masking is not
// available, the face is plain gold over the same depth.
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Platform, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

// Bright at the top, a deep band through the middle, a second highlight
// below it and burnished at the foot: what makes flat gold read as metal.
const FACE = ['#FFF6CF', '#F4D57E', '#C99630', '#F8E08F', '#B07E25'] as const;
const STOPS = [0, 0.3, 0.55, 0.74, 1] as const;

// The side of the letters, front to back.
const SIDE_FRONT = [166, 122, 34];
const SIDE_BACK = [62, 42, 8];

export function sideShade(layer: number, depth: number): string {
  const t = depth <= 1 ? 1 : (layer - 1) / (depth - 1);
  const mix = SIDE_FRONT.map((front, i) => Math.round(front + (SIDE_BACK[i] - front) * t));
  return `rgb(${mix.join(', ')})`;
}

export function GoldText({
  children,
  size = 18,
  letterSpacing = 1,
  depth,
  style,
}: {
  children: string;
  size?: number;
  letterSpacing?: number;
  // How far the letters stand off the card, in layers of a pixel each.
  depth?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const layers = depth ?? Math.max(2, Math.round(size / 6));
  const base: TextStyle = { fontSize: size, letterSpacing, fontWeight: '900', includeFontPadding: false };
  // Back to front, so each nearer layer is drawn over the one behind it.
  const order = Array.from({ length: layers }, (_, k) => layers - k);

  return (
    <View style={style} accessible accessibilityRole="text" accessibilityLabel={children}>
      {order.map(layer => (
        <Text
          key={layer}
          accessible={false}
          numberOfLines={1}
          style={[
            base,
            styles.layer,
            { left: layer * 0.6, top: layer, color: sideShade(layer, layers) },
            layer === layers && styles.dropShadow,
          ]}
        >
          {children}
        </Text>
      ))}
      <Text accessible={false} numberOfLines={1} style={[base, styles.layer, styles.rim]}>
        {children}
      </Text>
      {Platform.OS === 'web' ? (
        <Text accessible={false} numberOfLines={1} style={[base, styles.flatFace]}>
          {children}
        </Text>
      ) : (
        <MaskedView
          maskElement={
            <Text numberOfLines={1} style={[base, styles.mask]}>
              {children}
            </Text>
          }
        >
          <LinearGradient colors={FACE} locations={STOPS} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
            <Text accessible={false} numberOfLines={1} style={[base, styles.sizer]}>
              {children}
            </Text>
          </LinearGradient>
        </MaskedView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, top: 0 },
  dropShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 1.5, height: 2.5 },
    textShadowRadius: 3,
  },
  // A hair above and left of the face: the lit top edge.
  rim: { left: -0.8, top: -0.8, color: 'rgba(255, 249, 220, 0.95)' },
  flatFace: { color: '#E9C460' },
  mask: { color: '#000' },
  // Sizes the gradient to the text; never seen.
  sizer: { opacity: 0 },
});
