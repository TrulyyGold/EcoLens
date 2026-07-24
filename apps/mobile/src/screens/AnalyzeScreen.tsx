import React, { useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppButton } from '../components/AppButton';
import { Badge } from '../components/Badge';
import { BrandMark } from '../components/BrandMark';
import { Card } from '../components/Card';
import { Screen } from '../components/Layout';
import { useAppData } from '../context/AppDataContext';
import type { RootStackParamList } from '../navigation/types';
import { analyzeImage } from '../services/api';
import { colors, radii, spacing, type } from '../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Analyze'>;

const STEPS = [
  { title: 'Preparing the image', detail: 'Checking size, clarity, and format' },
  { title: 'Reading visible traits', detail: 'Looking for shape, texture, label, and context' },
  { title: 'Applying safety rules', detail: 'Checking risk, uncertainty, and recipe eligibility' },
  { title: 'Building your discovery', detail: 'Organizing evidence and provenance' },
];

export function AnalyzeScreen({ navigation, route }: Props): React.JSX.Element {
  const { addDiscovery } = useAppData();
  const [step, setStep] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = useCallback(async () => {
    setError(null);
    setStep(0);
    try {
      const outcome = await analyzeImage(
        route.params.image,
        route.params.demoKind ? { demoKind: route.params.demoKind } : {},
      );
      await addDiscovery(outcome.result);
      navigation.replace(
        'Result',
        route.params.image ? { outcome, image: route.params.image } : { outcome },
      );
    } catch {
      setError('EcoLens could not complete this analysis. Your photo is still on this device; try again or choose another image.');
    }
  }, [addDiscovery, navigation, route.params.demoKind, route.params.image]);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((current) => Math.min(current + 1, STEPS.length - 1));
    }, 1150);
    void runAnalysis();
    return () => clearInterval(interval);
  }, [attempt, runAnalysis]);

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.brandRow}>
        <BrandMark size={48} />
        <View style={styles.brandCopy}>
          <Text style={styles.brandName}>EcoLens</Text>
          <Text style={styles.brandDetail}>EVIDENCE-LED ANALYSIS</Text>
        </View>
        {__DEV__ && route.params.demoKind ? <Badge label="Demo" tone="neutral" /> : null}
      </View>

      <View style={styles.previewWrap}>
        {route.params.image ? (
          <Image
            accessibilityLabel="Photo being analyzed"
            resizeMode="cover"
            source={{ uri: route.params.image.uri }}
            style={styles.preview}
          />
        ) : (
          <View accessibilityLabel="Development demo analysis" style={[styles.preview, styles.demoPreview]}>
            <BrandMark size={92} inverse />
          </View>
        )}
        <View style={styles.scanLine} />
        <View style={styles.previewLabel}>
          <View style={styles.pulse} />
          <Text style={styles.previewLabelText}>{error ? 'ANALYSIS PAUSED' : 'ANALYZING SECURELY'}</Text>
        </View>
      </View>

      <Text accessibilityRole="header" style={styles.title}>{error ? 'Analysis needs another try' : 'Looking carefully…'}</Text>
      <Text accessibilityLiveRegion="polite" style={styles.subtitle}>
        {error ?? STEPS[step]?.detail}
      </Text>

      <Card style={styles.stepsCard}>
        {STEPS.map((item, index) => {
          const complete = index < step;
          const active = index === step && !error;
          return (
            <View key={item.title} style={styles.stepRow}>
              <View style={[styles.stepMarker, complete && styles.stepComplete, active && styles.stepActive]}>
                <Text style={[styles.stepMarkerText, (complete || active) && styles.stepMarkerTextActive]}>{complete ? '✓' : index + 1}</Text>
              </View>
              <View style={styles.stepCopy}>
                <Text style={[styles.stepTitle, active && styles.stepTitleActive]}>{item.title}</Text>
                <Text style={styles.stepDetail}>{item.detail}</Text>
              </View>
            </View>
          );
        })}
      </Card>

      {error ? (
        <View style={styles.errorActions}>
          <AppButton label="Retry analysis" onPress={() => setAttempt((value) => value + 1)} />
          <AppButton label="Choose another photo" variant="secondary" onPress={() => navigation.replace('Scanner', { launchLibrary: true })} />
        </View>
      ) : (
        <AppButton label="Cancel" variant="quiet" compact onPress={() => navigation.goBack()} />
      )}

      <Text style={styles.boundary}>EcoLens may be wrong. Never use an image result as proof that a wild species is edible or as medical advice.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: spacing.lg },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brandCopy: { flex: 1 },
  brandName: { ...type.h3, color: colors.ink },
  brandDetail: { ...type.label, color: colors.moss, fontSize: 9 },
  previewWrap: { marginTop: spacing.xl, borderRadius: radii.lg, overflow: 'hidden', backgroundColor: colors.forest, aspectRatio: 0.98, position: 'relative' },
  preview: { width: '100%', height: '100%' },
  demoPreview: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.forestSoft },
  scanLine: { position: 'absolute', left: spacing.lg, right: spacing.lg, top: '52%', height: 2, backgroundColor: colors.sun, shadowColor: colors.sun, shadowOpacity: 0.9, shadowRadius: 8 },
  previewLabel: { position: 'absolute', left: spacing.md, top: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: 'rgba(10,26,20,0.78)', borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  previewLabelText: { ...type.label, color: colors.white, fontSize: 9 },
  pulse: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.sun },
  title: { ...type.h1, color: colors.ink, textAlign: 'center', marginTop: spacing.xl },
  subtitle: { ...type.body, color: colors.inkMuted, textAlign: 'center', marginTop: spacing.xs, minHeight: 48 },
  stepsCard: { marginTop: spacing.lg, gap: spacing.md },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepMarker: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  stepActive: { backgroundColor: colors.sunPale, borderColor: colors.sun },
  stepComplete: { backgroundColor: colors.mossPale, borderColor: colors.moss },
  stepMarkerText: { ...type.small, color: colors.inkMuted },
  stepMarkerTextActive: { color: colors.forest, fontWeight: '800' },
  stepCopy: { flex: 1 },
  stepTitle: { ...type.bodyStrong, color: colors.inkMuted },
  stepTitleActive: { color: colors.ink },
  stepDetail: { ...type.small, color: colors.inkMuted },
  errorActions: { gap: spacing.sm, marginTop: spacing.lg },
  boundary: { ...type.small, color: colors.inkMuted, textAlign: 'center', marginTop: spacing.lg },
});
