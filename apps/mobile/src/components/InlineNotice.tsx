import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, type } from '../theme/theme';

export function InlineNotice({ title, body, tone = 'info' }: { title: string; body: string; tone?: 'info' | 'error' }): React.JSX.Element {
  const palette = tone === 'error'
    ? { background: colors.coralPale, foreground: colors.coral }
    : { background: colors.bluePale, foreground: colors.blue };
  return (
    <View accessibilityRole="alert" style={[styles.root, { backgroundColor: palette.background }]}>
      <View style={[styles.dot, { backgroundColor: palette.foreground }]} />
      <View style={styles.copy}>
        <Text style={[styles.title, { color: palette.foreground }]}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { borderRadius: radii.md, padding: spacing.md, flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  dot: { width: 9, height: 9, borderRadius: 5, marginTop: 6 },
  copy: { flex: 1 },
  title: { ...type.bodyStrong, marginBottom: 2 },
  body: { ...type.small, color: colors.ink },
});
