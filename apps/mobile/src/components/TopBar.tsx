import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, type } from '../theme/theme';

export function TopBar({ title, onBack, action }: { title: string; onBack: () => void; action?: React.ReactNode }): React.JSX.Element {
  return (
    <View style={styles.root}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={10}
        onPress={onBack}
        style={({ pressed }) => [styles.back, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text style={styles.backArrow}>‹</Text>
      </Pressable>
      <Text numberOfLines={1} accessibilityRole="header" style={styles.title}>{title}</Text>
      <View style={styles.action}>{action}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { minHeight: 56, flexDirection: 'row', alignItems: 'center', marginHorizontal: -spacing.xs, marginBottom: spacing.sm },
  back: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  backArrow: { fontSize: 38, lineHeight: 40, color: colors.forest },
  title: { ...type.bodyStrong, color: colors.ink, textAlign: 'center', flex: 1 },
  action: { width: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
});
