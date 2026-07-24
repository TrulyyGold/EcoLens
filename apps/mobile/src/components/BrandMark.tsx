import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../theme/theme';

interface BrandMarkProps {
  size?: number;
  inverse?: boolean;
}

export function BrandMark({ size = 42, inverse = false }: BrandMarkProps): React.JSX.Element {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="EcoLens leaf mark"
      style={[
        styles.frame,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: inverse ? colors.cream : colors.forest },
      ]}
    >
      <View style={[styles.leaf, styles.leftLeaf, { width: size * 0.19, height: size * 0.46, backgroundColor: inverse ? colors.moss : colors.cream }]} />
      <View style={[styles.leaf, styles.rightLeaf, { width: size * 0.17, height: size * 0.39, backgroundColor: colors.sun }]} />
      <View style={[styles.stem, { width: size * 0.05, height: size * 0.38, backgroundColor: inverse ? colors.cream : colors.mossPale }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  leaf: { position: 'absolute', borderRadius: 999 },
  leftLeaf: { transform: [{ translateX: -5 }, { translateY: -3 }, { rotate: '-36deg' }] },
  rightLeaf: { transform: [{ translateX: 6 }, { translateY: -1 }, { rotate: '38deg' }] },
  stem: { position: 'absolute', bottom: '18%', borderRadius: 999 },
});
