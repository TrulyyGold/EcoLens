import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, type } from '../theme/theme';

interface BadgeProps {
  label: string;
  tone?: 'neutral' | 'green' | 'amber' | 'red' | 'blue';
}

const palettes = {
  neutral: { background: colors.cream, foreground: colors.inkMuted },
  green: { background: colors.mossPale, foreground: colors.forest },
  amber: { background: colors.amberPale, foreground: colors.amber },
  red: { background: colors.coralPale, foreground: colors.coral },
  blue: { background: colors.bluePale, foreground: colors.blue },
};

export function Badge({ label, tone = 'neutral' }: BadgeProps): React.JSX.Element {
  const palette = palettes[tone];
  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <Text style={[styles.label, { color: palette.foreground }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignSelf: 'flex-start', borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  label: { ...type.label, fontSize: 10, lineHeight: 13 },
});
