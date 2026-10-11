// "TEST" on the test app, so a screenshot, a phone on a desk or a person
// testing never mistakes it for the members' app (docs/environments.md).
// Nothing on the members' app.
import Constants from 'expo-constants';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { appVariantOf } from '../lib/build';

export const APP_VARIANT = appVariantOf(Constants.expoConfig?.extra?.appVariant);

export function TestBadge() {
  if (APP_VARIANT !== 'test') return null;
  return (
    <View style={styles.badge} accessibilityLabel="Test app">
      <Text style={styles.text}>TEST</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#FFD3A6',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginHorizontal: 12,
    alignSelf: 'center',
  },
  text: { color: '#7A3E00', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
});
