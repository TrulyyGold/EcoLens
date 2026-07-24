import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, spacing, type } from '../theme/theme';

interface AppButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  style?: StyleProp<ViewStyle>;
  detail?: string;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  loading?: boolean;
  leading?: React.ReactNode;
  compact?: boolean;
}

export function AppButton({
  label,
  detail,
  variant = 'primary',
  loading = false,
  leading,
  compact = false,
  disabled,
  style,
  ...props
}: AppButtonProps): React.JSX.Element {
  const palette = buttonPalettes[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={detail}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        { backgroundColor: palette.background, borderColor: palette.border, opacity: disabled ? 0.5 : pressed ? 0.86 : 1 },
        style,
      ]}
      {...props}
    >
      {loading ? <ActivityIndicator color={palette.foreground} /> : leading}
      <View style={styles.copy}>
        <Text style={[styles.label, { color: palette.foreground }]}>{label}</Text>
        {detail ? <Text style={[styles.detail, { color: palette.detail }]}>{detail}</Text> : null}
      </View>
    </Pressable>
  );
}

const buttonPalettes = {
  primary: { background: colors.forest, foreground: colors.white, detail: colors.mossPale, border: colors.forest },
  secondary: { background: colors.white, foreground: colors.forest, detail: colors.inkMuted, border: colors.line },
  quiet: { background: colors.mossPale, foreground: colors.forest, detail: colors.forestSoft, border: colors.mossPale },
  danger: { background: colors.coral, foreground: colors.white, detail: colors.coralPale, border: colors.coral },
};

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  compact: { minHeight: 44, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  copy: { flexShrink: 1, alignItems: 'center' },
  label: { ...type.bodyStrong, textAlign: 'center' },
  detail: { ...type.small, textAlign: 'center', marginTop: 1 },
});
