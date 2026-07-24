import React, { type PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, Text, View, type ScrollViewProps, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, type } from '../theme/theme';
import { BrandMark } from './BrandMark';

interface ScreenProps extends PropsWithChildren {
  scroll?: boolean;
  contentStyle?: ViewStyle;
  scrollProps?: Omit<ScrollViewProps, 'contentContainerStyle'>;
}

export function Screen({ children, scroll = true, contentStyle, scrollProps }: ScreenProps): React.JSX.Element {
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          {...scrollProps}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.flex, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  showMark?: boolean;
  action?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, description, showMark = false, action }: PageHeaderProps): React.JSX.Element {
  return (
    <View style={styles.headerRow}>
      <View style={styles.headerCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text> : null}
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {action ?? (showMark ? <BrandMark size={46} /> : null)}
    </View>
  );
}

export function SectionTitle({ title, detail }: { title: string; detail?: string }): React.JSX.Element {
  return (
    <View style={styles.sectionTitle}>
      <Text accessibilityRole="header" style={styles.sectionHeading}>{title}</Text>
      {detail ? <Text style={styles.sectionDetail}>{detail}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl + spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md, paddingTop: spacing.md, marginBottom: spacing.lg },
  headerCopy: { flex: 1 },
  eyebrow: { ...type.label, color: colors.moss, marginBottom: spacing.xs },
  title: { ...type.h1, color: colors.ink },
  description: { ...type.body, color: colors.inkMuted, marginTop: spacing.xs },
  sectionTitle: { marginTop: spacing.xl, marginBottom: spacing.sm },
  sectionHeading: { ...type.h2, color: colors.ink },
  sectionDetail: { ...type.small, color: colors.inkMuted, marginTop: 3 },
});
