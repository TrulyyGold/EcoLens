import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ScanResult } from '../types/scan';
import { categoryStyles, colors, radii, spacing, type } from '../theme/theme';
import { formatDiscoveryDate, formatDiscoveryTime } from '../utils/date';
import { Badge } from './Badge';
import { CategoryMark } from './CategoryMark';

export function DiscoveryRow({ result, onPress, favorite = false }: { result: ScanResult; onPress: () => void; favorite?: boolean }): React.JSX.Element {
  const category = categoryStyles[result.identification.category];
  const riskTone = result.safety.do_not_consume || result.safety.risk_level === 'high'
    ? 'red'
    : result.safety.risk_level === 'caution'
      ? 'amber'
      : 'green';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${result.identification.name} discovery`}
      onPress={onPress}
      style={({ pressed }) => [styles.root, { opacity: pressed ? 0.82 : 1 }]}
    >
      <CategoryMark category={result.identification.category} size={56} />
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={styles.name}>{result.identification.name}</Text>
          {favorite ? <Text accessibilityLabel="Favorite" style={styles.favorite}>Saved</Text> : null}
        </View>
        <Text style={styles.meta}>{category.label} · {formatDiscoveryDate(result.created_at)} · {formatDiscoveryTime(result.created_at)}</Text>
        <View style={styles.badges}>
          <Badge label={`${Math.round(result.identification.confidence * 100)}% match`} tone="blue" />
          <Badge label={result.safety.risk_level} tone={riskTone} />
          {__DEV__ && result.analysis_meta.mock ? <Badge label="Demo" tone="neutral" /> : null}
        </View>
      </View>
      <Text accessibilityElementsHidden style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
    padding: spacing.sm,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  copy: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  name: { ...type.h3, color: colors.ink, flexShrink: 1 },
  favorite: { ...type.small, color: colors.moss },
  meta: { ...type.small, color: colors.inkMuted, marginTop: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: spacing.xs },
  chevron: { color: colors.moss, fontSize: 28, lineHeight: 30 },
});
