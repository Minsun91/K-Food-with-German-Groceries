import React from 'react';
import { View, StyleSheet } from 'react-native';

export function AnimatedIcon() {
  return <View style={styles.container} />;
}

export function AnimatedSplashOverlay() {
  return null;
}

const styles = StyleSheet.create({
  container: {
    width: 24,
    height: 24,
  },
});