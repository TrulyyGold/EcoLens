import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, type } from '../theme/theme';

export function ListItem({ children, index }: { children: React.ReactNode; index?: number }): React.JSX.Element {
  return (
    <View style={styles.row}>
      <View style={styles.marker}>
        <Text style={styles.markerText}>{index === undefined ? '—' : index + 1}</Text>
      </View>
      <Text style={styles.text}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, alignItems: 'flex-start' },
  marker: { minWidth: 23, height: 23, borderRadius: 12, backgroundColor: colors.mossPale, alignItems: 'center', justifyContent: 'center' },
  markerText: { ...type.small, color: colors.forest, fontSize: 11 },
  text: { ...type.body, color: colors.ink, flex: 1 },
});
