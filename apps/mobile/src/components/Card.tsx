import React, { type PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radii, spacing } from '../theme/theme';

interface CardProps extends PropsWithChildren {
  style?: ViewStyle | ViewStyle[];
  tone?: 'default' | 'soft' | 'dark';
}

export function Card({ children, style, tone = 'default' }: CardProps): React.JSX.Element {
  return <View style={[styles.root, tones[tone], style]}>{children}</View>;
}

const tones = StyleSheet.create({
  default: { backgroundColor: colors.white, borderColor: colors.line },
  soft: { backgroundColor: colors.cream, borderColor: colors.cream },
  dark: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
    shadowColor: colors.shadow,
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
});

const styles = StyleSheet.create({
  root: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.md },
});
