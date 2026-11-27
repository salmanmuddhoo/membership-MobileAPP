// The eight-pointed star of Islamic geometry, in fine gold line, laid over
// the dark emerald surfaces (the home screen's header, the welcome, the
// lock). Two squares, one turned 45°: plain Views, so nothing to load and
// nothing to install. Decoration only: hidden from screen readers and
// never in the way of a touch.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from './theme';

type StarSpec = { size: number; top: number; right: number; opacity: number };

function Star({ size, top, right, opacity, stroke }: StarSpec & { stroke: number }) {
  // A square whose diagonal is the star's width.
  const side = size / Math.SQRT2;
  const square = { width: side, height: side, borderWidth: stroke, borderColor: colors.accent };
  return (
    <View style={[styles.star, { width: size, height: size, top, right, opacity }]}>
      <View style={[styles.square, square]} />
      <View style={[styles.square, square, { transform: [{ rotate: '45deg' }] }]} />
    </View>
  );
}

// A cluster, nested and offset, bleeding off the top right corner.
const CLUSTER: StarSpec[] = [
  { size: 260, top: -70, right: -80, opacity: 0.22 },
  { size: 190, top: -35, right: -45, opacity: 0.16 },
  { size: 120, top: 0, right: -10, opacity: 0.12 },
  { size: 86, top: 118, right: 128, opacity: 0.12 },
];

export function StarPattern({ scale = 1, stroke = 1.25 }: { scale?: number; stroke?: number }) {
  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {CLUSTER.map((s, i) => (
        <Star
          key={i}
          size={s.size * scale}
          top={s.top * scale}
          right={s.right * scale}
          opacity={s.opacity}
          stroke={stroke}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  star: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  square: { position: 'absolute' },
});
