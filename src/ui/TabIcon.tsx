// A tab bar icon that lifts when its tab is chosen: a short rise and a
// little growth, back down when another tab takes over.
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useState } from 'react';
import { Animated, Easing, type ColorValue } from 'react-native';

export function TabIcon({
  name,
  color,
  size,
  focused,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: ColorValue;
  size: number;
  focused: boolean;
}) {
  const [lift] = useState(() => new Animated.Value(focused ? 1 : 0));
  useEffect(() => {
    const animation = Animated.timing(lift, {
      toValue: focused ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.back(1.6)),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [focused, lift]);

  return (
    <Animated.View
      style={{
        transform: [
          { translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) },
          { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) },
        ],
      }}
    >
      <Ionicons name={name} color={color} size={size} />
    </Animated.View>
  );
}
