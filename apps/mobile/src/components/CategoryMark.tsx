import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ScanCategory } from '../types/scan';
import { categoryStyles, radii, type } from '../theme/theme';

interface CategoryMarkProps {
  category: ScanCategory;
  size?: number;
}

export function CategoryMark({ category, size = 54 }: CategoryMarkProps): React.JSX.Element {
  const theme = categoryStyles[category];
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${theme.label} category`}
      style={[styles.root, { width: size, height: size, borderRadius: size * 0.34, backgroundColor: theme.background }]}
    >
      <View style={[styles.accent, { backgroundColor: theme.accent, width: size * 0.16, height: size * 0.16 }]} />
      <Text style={[styles.letter, { color: theme.foreground, fontSize: size * 0.37 }]}>{theme.shortLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  accent: { position: 'absolute', top: 7, right: 7, borderRadius: radii.pill },
  letter: { ...type.h2, lineHeight: undefined },
});
