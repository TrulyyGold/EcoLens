import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppButton } from '../components/AppButton';
import { Badge } from '../components/Badge';
import { BrandMark } from '../components/BrandMark';
import { Card } from '../components/Card';
import { DiscoveryRow } from '../components/DiscoveryRow';
import { InlineNotice } from '../components/InlineNotice';
import { PageHeader, Screen, SectionTitle } from '../components/Layout';
import { useAppData } from '../context/AppDataContext';
import type { RootStackParamList } from '../navigation/types';
import { colors, radii, spacing, type } from '../theme/theme';

export function HomeScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { journal, loading, storageError, syncError } = useAppData();
  const recent = journal.slice(0, 3);

  return (
    <Screen>
      <PageHeader
        eyebrow="Nature & nutrition, in focus"
        title="Look closer. Choose safer."
        description="Photograph food, plants, or fungi for an evidence-led identification—not a safety guarantee."
        showMark
      />

      {storageError ? <InlineNotice title="Device save issue" body={storageError} tone="error" /> : null}
      {syncError ? <InlineNotice title="History is offline" body={syncError} /> : null}

      <Card tone="dark" style={styles.hero}>
        <View style={styles.heroHeading}>
          <BrandMark size={58} inverse />
          <Badge label="Evidence first" tone="green" />
        </View>
        <Text accessibilityRole="header" style={styles.heroTitle}>A clearer read on what’s in front of you.</Text>
        <Text style={styles.heroBody}>Good light and a sharp, close photo help EcoLens surface visible traits, uncertainty, safety notes, and nutrition provenance.</Text>
        <View style={styles.heroActions}>
          <AppButton
            label="Open camera"
            detail="Take a new photo"
            variant="secondary"
            onPress={() => navigation.navigate('Scanner')}
          />
          <AppButton
            label="Choose a photo"
            variant="quiet"
            compact
            onPress={() => navigation.navigate('Scanner', { launchLibrary: true })}
          />
        </View>
      </Card>

      <View style={styles.principles}>
        <View style={styles.principle}>
          <View style={[styles.number, styles.numberGreen]}><Text style={styles.numberText}>01</Text></View>
          <Text style={styles.principleTitle}>Visible evidence</Text>
          <Text style={styles.principleBody}>See why a match was suggested and which look-alikes remain.</Text>
        </View>
        <View style={styles.principle}>
          <View style={[styles.number, styles.numberAmber]}><Text style={styles.numberText}>02</Text></View>
          <Text style={styles.principleTitle}>Safety before ideas</Text>
          <Text style={styles.principleBody}>Warnings stay prominent. Unsafe scans never show recipes.</Text>
        </View>
      </View>

      {__DEV__ ? (
        <>
          <SectionTitle title="Development demos" detail="Fixtures are clearly marked and never presented as live analysis." />
          <View style={styles.demoCard}>
            <Badge label="Development only" tone="neutral" />
            <Text style={styles.demoText}>Preview complete, caution, and high-risk result states without a backend.</Text>
            <View style={styles.demoActions}>
              <AppButton label="Banana" compact variant="secondary" onPress={() => navigation.navigate('Analyze', { demoKind: 'banana' })} />
              <AppButton label="Package" compact variant="secondary" onPress={() => navigation.navigate('Analyze', { demoKind: 'doritos' })} />
              <AppButton label="Mushroom safety" compact variant="danger" onPress={() => navigation.navigate('Analyze', { demoKind: 'mushroom' })} />
            </View>
          </View>
        </>
      ) : null}

      <SectionTitle title="Recent discoveries" detail="Stored on this device and refreshed from your configured EcoLens API." />
      {loading ? (
        <View accessibilityRole="progressbar" accessibilityLabel="Loading recent discoveries" style={styles.loading}>
          <ActivityIndicator color={colors.moss} />
          <Text style={styles.loadingText}>Opening your journal…</Text>
        </View>
      ) : recent.length > 0 ? (
        recent.map((result) => (
          <DiscoveryRow
            key={result.scan_id}
            result={result}
            onPress={() => navigation.navigate('Result', { outcome: { result, source: result.analysis_meta.mock ? 'demo' : 'api' } })}
          />
        ))
      ) : (
        <Card tone="soft" style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Your first discovery starts with a photo.</Text>
          <Text style={styles.emptyBody}>Nothing is uploaded until you choose Analyze.</Text>
        </Card>
      )}

      <Card tone="soft" style={styles.boundary}>
        <Text style={styles.boundaryKicker}>IMPORTANT BOUNDARY</Text>
        <Text style={styles.boundaryTitle}>Never use a photo to decide whether a wild plant or mushroom is edible.</Text>
        <Text style={styles.boundaryBody}>Use a qualified local expert. If ingestion may have occurred, contact poison control or emergency services immediately.</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { padding: spacing.lg, overflow: 'hidden' },
  heroHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroTitle: { ...type.hero, color: colors.white, marginTop: spacing.lg, maxWidth: 320 },
  heroBody: { ...type.body, color: colors.mossPale, marginTop: spacing.sm, maxWidth: 340 },
  heroActions: { marginTop: spacing.lg, gap: spacing.sm },
  principles: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  principle: { flex: 1, backgroundColor: colors.white, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line, padding: spacing.md },
  number: { width: 34, height: 24, borderRadius: radii.pill, justifyContent: 'center', alignItems: 'center' },
  numberGreen: { backgroundColor: colors.mossPale },
  numberAmber: { backgroundColor: colors.amberPale },
  numberText: { ...type.label, color: colors.forest, fontSize: 10 },
  principleTitle: { ...type.h3, color: colors.ink, marginTop: spacing.sm },
  principleBody: { ...type.small, color: colors.inkMuted, marginTop: spacing.xs },
  demoCard: { backgroundColor: colors.cream, borderRadius: radii.lg, padding: spacing.md },
  demoText: { ...type.small, color: colors.inkMuted, marginTop: spacing.sm },
  demoActions: { gap: spacing.xs, marginTop: spacing.md },
  loading: { paddingVertical: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  loadingText: { ...type.body, color: colors.inkMuted },
  emptyCard: { marginBottom: spacing.sm },
  emptyTitle: { ...type.h3, color: colors.ink },
  emptyBody: { ...type.body, color: colors.inkMuted, marginTop: spacing.xs },
  boundary: { marginTop: spacing.xl, backgroundColor: colors.coralPale, borderColor: colors.coralPale },
  boundaryKicker: { ...type.label, color: colors.coral },
  boundaryTitle: { ...type.h3, color: colors.ink, marginTop: spacing.xs },
  boundaryBody: { ...type.small, color: colors.inkMuted, marginTop: spacing.xs },
});
