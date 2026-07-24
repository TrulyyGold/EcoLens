import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, type } from '../theme/theme';
import { BrandMark } from './BrandMark';

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }): React.JSX.Element {
  return (
    <View style={styles.root}>
      <BrandMark size={58} />
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  title: { ...type.h2, color: colors.ink, textAlign: 'center', marginTop: spacing.md },
  body: { ...type.body, color: colors.inkMuted, textAlign: 'center', marginTop: spacing.xs, maxWidth: 320 },
  action: { marginTop: spacing.lg, alignSelf: 'stretch' },
});
