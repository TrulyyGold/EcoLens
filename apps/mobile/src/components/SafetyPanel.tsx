import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ScanResult } from '../types/scan';
import { colors, radii, spacing, type } from '../theme/theme';
import { getSafetyPresentation } from '../utils/safety';

const palettes = {
  safe: { background: colors.mossPale, foreground: colors.forest, marker: colors.moss },
  caution: { background: colors.amberPale, foreground: '#71450E', marker: colors.amber },
  danger: { background: colors.coralPale, foreground: '#702A20', marker: colors.coral },
  unknown: { background: colors.bluePale, foreground: colors.blue, marker: colors.blue },
};

export function SafetyPanel({ result }: { result: ScanResult }): React.JSX.Element {
  const presentation = getSafetyPresentation(result);
  const palette = palettes[presentation.tone];
  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel={`${presentation.title}. ${result.safety.headline}`}
      style={[styles.root, { backgroundColor: palette.background, borderColor: palette.marker }]}
    >
      <View style={styles.headingRow}>
        <View style={[styles.marker, { backgroundColor: palette.marker }]} />
        <View style={styles.headingCopy}>
          <Text style={[styles.kicker, { color: palette.foreground }]}>SAFETY FIRST</Text>
          <Text accessibilityRole="header" style={[styles.title, { color: palette.foreground }]}>{presentation.title}</Text>
        </View>
      </View>
      <Text style={styles.headline}>{result.safety.headline}</Text>
      {result.safety.warnings.map((warning) => (
        <View key={warning} style={styles.warningRow}>
          <Text style={[styles.bullet, { color: palette.marker }]}>—</Text>
          <Text style={styles.warning}>{warning}</Text>
        </View>
      ))}
      <View style={[styles.actionBox, { borderColor: palette.marker }]}>
        <Text style={styles.action}>{presentation.action}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { borderRadius: radii.lg, borderWidth: 2, padding: spacing.md, marginTop: spacing.lg },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headingCopy: { flex: 1 },
  marker: { width: 13, height: 36, borderRadius: radii.pill },
  kicker: { ...type.label, fontSize: 10 },
  title: { ...type.h2 },
  headline: { ...type.bodyStrong, color: colors.ink, marginTop: spacing.md, marginBottom: spacing.xs },
  warningRow: { flexDirection: 'row', gap: spacing.xs, marginTop: 5 },
  bullet: { ...type.bodyStrong },
  warning: { ...type.body, color: colors.ink, flex: 1 },
  actionBox: { borderTopWidth: 1, marginTop: spacing.md, paddingTop: spacing.sm },
  action: { ...type.small, color: colors.ink },
});
