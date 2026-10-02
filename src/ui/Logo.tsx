// The Society's emblem, on the white badge it was drawn for, with the
// entrance it makes when a screen opens: a short rise and fade. Plain
// Animated, native-driven — nothing to configure, nothing to go wrong on a
// low-end phone.
import React, { useEffect, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';

const emblem = require('../../assets/logo.png');

export function Logo({ size = 96 }: { size?: number }) {
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size * 0.27 }]}>
      <Image source={emblem} style={{ width: size * 0.86, height: size * 0.86 }} resizeMode="contain" />
    </View>
  );
}

export function AnimatedLogo({ size = 96, delay = 0 }: { size?: number; delay?: number }) {
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 650,
      delay,
      easing: Easing.out(Easing.back(1.4)),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [delay, progress]);

  return (
    <Animated.View
      style={{
        opacity: progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
        transform: [
          { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
        ],
      }}
    >
      <Logo size={size} />
    </Animated.View>
  );
}

// Anything that should arrive just after the logo: fades up in its wake.
export function FadeIn({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 500,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [delay, progress]);
  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
