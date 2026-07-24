import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, type } from '../theme/theme';

export function ConfidenceMeter({ confidence, label }: { confidence: number; label: string }): React.JSX.Element {
  const percent = Math.round(confidence * 100);
  const color = confidence >= 0.8 ? colors.moss : confidence >= 0.55 ? colors.sun : colors.coral;
  return (
    <View accessible accessibilityLabel={`${percent} percent confidence, ${label}`}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>VISUAL MATCH</Text>
        <Text style={styles.value}>{percent}% · {label}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  label: { ...type.label, color: colors.inkMuted },
  value: { ...type.small, color: colors.ink, textTransform: 'capitalize' },
  track: { height: 8, backgroundColor: colors.line, borderRadius: radii.pill, overflow: 'hidden', marginTop: spacing.xs },
  fill: { height: '100%', borderRadius: radii.pill },
});
