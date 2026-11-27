// The tab bar's icons. The chosen tab's icon fills in and sits in a soft
// emerald pill that grows in from the middle; the others are outlines.
// And Transact, the one thing the bar is for doing rather than looking,
// is a raised round button in the middle of it.
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ColorValue,
  type GestureResponderEvent,
} from 'react-native';
import { GlassSheen } from './Glass';
import { colors, glass } from './theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function TabIcon({
  name,
  activeName,
  color,
  size,
  focused,
}: {
  name: IconName;
  activeName?: IconName;
  color: ColorValue;
  size: number;
  focused: boolean;
}) {
  const [on] = useState(() => new Animated.Value(focused ? 1 : 0));
  useEffect(() => {
    const animation = Animated.timing(on, {
      toValue: focused ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [focused, on]);

  return (
    <View style={styles.iconWrap}>
      <Animated.View style={[styles.pill, { opacity: on, transform: [{ scaleX: on }] }]} />
      <Ionicons name={focused && activeName ? activeName : name} color={color} size={size - 2} />
    </View>
  );
}

// Typed loosely on purpose: the navigator passes more than this, and needs
// only that the press and the selected state come back to it.
export function CenterTabButton({
  onPress,
  onLongPress,
  'aria-selected': selected,
  testID,
}: {
  onPress?: (e: GestureResponderEvent) => void;
  onLongPress?: ((e: GestureResponderEvent) => void) | null;
  'aria-selected'?: boolean;
  testID?: string;
}) {
  return (
    <View style={styles.centerSlot}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress ?? undefined}
        testID={testID}
        accessibilityRole="tab"
        accessibilityLabel="Transact"
        accessibilityState={{ selected: !!selected }}
        style={({ pressed }) => [styles.centerButton, pressed && styles.centerPressed]}
      >
        <GlassSheen radius={29} intensity={0.18} />
        <Ionicons name="swap-horizontal" size={26} color={selected ? colors.accent : '#fff'} />
      </Pressable>
      <Text style={[styles.centerLabel, { color: selected ? colors.primary : colors.muted }]}>Transact</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: { width: 56, height: 28, alignItems: 'center', justifyContent: 'center' },
  pill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
  },
  centerSlot: { flex: 1, alignItems: 'center' },
  centerButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    marginTop: -28,
    ...glass.emerald,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerPressed: { transform: [{ scale: 0.94 }], backgroundColor: 'rgba(11, 68, 58, 0.92)' },
  centerLabel: { fontSize: 11, fontWeight: '600', marginTop: 7 },
});
