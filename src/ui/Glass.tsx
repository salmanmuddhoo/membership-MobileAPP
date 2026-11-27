// The highlight across the top of a glass button: a soft capsule of light,
// rounded at the bottom as well as the top so it reads as a reflection,
// not a stripe. Goes first among the button's children, so the label and
// icon sit over it. Decoration only.
import React from 'react';
import { StyleSheet, View } from 'react-native';

export function GlassSheen({ radius, intensity = 0.16 }: { radius: number; intensity?: number }) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.sheen,
        { borderRadius: Math.max(radius - 3, 4), backgroundColor: `rgba(255, 255, 255, ${intensity})` },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  sheen: { position: 'absolute', top: 3, left: 5, right: 5, height: '46%' },
});
