import React, { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppButton } from '../components/AppButton';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { CategoryMark } from '../components/CategoryMark';
import { ConfidenceMeter } from '../components/ConfidenceMeter';
import { InlineNotice } from '../components/InlineNotice';
import { ListItem } from '../components/ListItem';
import { Screen, SectionTitle } from '../components/Layout';
import { SafetyPanel } from '../components/SafetyPanel';
import { TopBar } from '../components/TopBar';
import { useAppData } from '../context/AppDataContext';
import type { RootStackParamList } from '../navigation/types';
import { generateRecipes } from '../services/api';
import { fallbackExplanation } from '../services/fallbackCopy';
import type { ScanNutrition, ScanRecipe } from '../types/scan';
import { categoryStyles, colors, radii, spacing, type } from '../theme/theme';
import { formatDiscoveryDate, formatDiscoveryTime } from '../utils/date';
import { getSafetyPresentation } from '../utils/safety';

type Props = NativeStackScreenProps<RootStackParamList, 'Result'>;
type BadgeTone = 'neutral' | 'green' | 'amber' | 'red' | 'blue';

function riskTone(risk: string): BadgeTone {
  if (risk === 'high') return 'red';
  if (risk === 'caution') return 'amber';
  if (risk === 'low') return 'green';
  return 'blue';
}

function NutritionPanel({ nutrition }: { nutrition: ScanNutrition | null | undefined }): React.JSX.Element {
  if (!nutrition || nutrition.basis === 'unavailable') {
    return (
      <Card tone="soft">
        <Text style={styles.unavailableTitle}>Nutrition data is unavailable.</Text>
        <Text style={styles.unavailableBody}>A photo cannot measure nutrients. Use a package label or a verified food database when values matter.</Text>
      </Card>
    );
  }

  const values = [
    ['Calories', nutrition.calories == null ? '—' : String(nutrition.calories)],
    ['Protein', nutrition.protein_g == null ? '—' : `${nutrition.protein_g} g`],
    ['Carbs', nutrition.carbs_g == null ? '—' : `${nutrition.carbs_g} g`],
    ['Fat', nutrition.fat_g == null ? '—' : `${nutrition.fat_g} g`],
    ['Sugar', nutrition.sugar_g == null ? '—' : `${nutrition.sugar_g} g`],
    ['Sodium', nutrition.sodium_mg == null ? '—' : `${nutrition.sodium_mg} mg`],
  ] as const;
  const basisCopy = nutrition.basis === 'label'
    ? 'Transcribed from a visible product label'
    : nutrition.basis === 'estimated'
      ? 'Estimated from a reference product'
      : 'General reference value for this food';

  return (
    <Card>
      <View style={styles.provenanceRow}>
        <Badge label={`${nutrition.basis} data`} tone={nutrition.basis === 'label' ? 'green' : 'amber'} />
        <Text style={styles.provenance}>{basisCopy}</Text>
      </View>
      <Text style={styles.serving}>{nutrition.serving_size ?? 'Serving size was not provided'}</Text>
      <View style={styles.nutritionGrid}>
        {values.map(([label, value]) => (
          <View key={label} style={styles.nutritionCell}>
            <Text style={styles.nutritionValue}>{value}</Text>
            <Text style={styles.nutritionLabel}>{label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.provenanceNotice}>
        <Text style={styles.provenanceNoticeTitle}>PROVENANCE, NOT A MEASUREMENT</Text>
        <Text style={styles.provenanceNoticeBody}>These values were not measured from the photographed item. Size, recipe, market, and formulation can change them.</Text>
      </View>
      {nutrition.notes.map((note) => <ListItem key={note}>{note}</ListItem>)}
    </Card>
  );
}

function RecipeCard({ recipe, index }: { recipe: ScanRecipe; index: number }): React.JSX.Element {
  return (
    <Card style={styles.recipeCard}>
      <View style={styles.recipeHeading}>
        <View style={styles.recipeNumber}><Text style={styles.recipeNumberText}>{String(index + 1).padStart(2, '0')}</Text></View>
        <View style={styles.recipeHeadingCopy}>
          <Text accessibilityRole="header" style={styles.recipeTitle}>{recipe.title}</Text>
          <Text style={styles.recipeMeta}>{recipe.time_minutes} min · {recipe.difficulty}</Text>
        </View>
        <Badge label="Safety checked" tone="green" />
      </View>
      <Text style={styles.recipeSection}>INGREDIENTS</Text>
      {recipe.ingredients.map((ingredient) => <ListItem key={ingredient}>{ingredient}</ListItem>)}
      <Text style={styles.recipeSection}>METHOD</Text>
      {recipe.steps.map((step, stepIndex) => <ListItem key={`${stepIndex}-${step}`} index={stepIndex}>{step}</ListItem>)}
      {recipe.dietary_notes.length > 0 ? (
        <View style={styles.dietaryBox}>
          <Text style={styles.dietaryTitle}>DIETARY & ALLERGEN NOTES</Text>
          {recipe.dietary_notes.map((note) => <Text key={note} style={styles.dietaryNote}>— {note}</Text>)}
        </View>
      ) : null}
      <Text style={styles.recipeBoundary}>Verify identity, freshness, package allergens, cooking temperature, and dietary needs before preparing.</Text>
    </Card>
  );
}

export function ResultScreen({ navigation, route }: Props): React.JSX.Element {
  const { outcome } = route.params;
  const { result } = outcome;
  const { isFavorite, toggleFavorite, storageError } = useAppData();
  const safety = getSafetyPresentation(result);
  const category = categoryStyles[result.identification.category];
  const [recipes, setRecipes] = useState<ScanRecipe[]>(safety.shouldSuppressRecipes ? [] : result.recipes);
  const [preferences, setPreferences] = useState('');
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const [suppressionReason, setSuppressionReason] = useState<string | null>(safety.shouldSuppressRecipes ? safety.action : null);
  const favorite = isFavorite(result.scan_id);
  const fallbackCopy = fallbackExplanation(outcome);
  const displayImageUri = result.image_url ?? route.params.image?.uri;

  const nutritionDetail = useMemo(() => {
    if (!result.nutrition || result.nutrition.basis === 'unavailable') return 'No verified values available';
    return `${result.nutrition.basis} values · review provenance below`;
  }, [result.nutrition]);

  const requestRecipes = async (): Promise<void> => {
    setRecipeLoading(true);
    setRecipeError(null);
    try {
      const generated = await generateRecipes(
        result,
        preferences.split(',').map((item) => item.trim()).filter(Boolean),
      );
      setRecipes(generated.recipes);
      setSuppressionReason(generated.suppressed ? generated.reason ?? safety.action : null);
    } catch {
      setRecipeError('Safe recipe ideas could not be generated. Check the connection and retry. Existing scan details are still available.');
    } finally {
      setRecipeLoading(false);
    }
  };

  return (
    <Screen>
      <TopBar
        title="Discovery"
        onBack={() => navigation.goBack()}
        action={(
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={favorite ? 'Remove from favorites' : 'Add to favorites'}
            accessibilityState={{ selected: favorite }}
            hitSlop={10}
            onPress={() => void toggleFavorite(result.scan_id)}
            style={({ pressed }) => [{ opacity: pressed ? 0.55 : 1 }]}
          >
            <Text style={[styles.favorite, favorite && styles.favoriteActive]}>♥</Text>
          </Pressable>
        )}
      />

      {fallbackCopy ? (
        <View style={styles.fallbackBox}>
          <InlineNotice title="Demo result shown" body={fallbackCopy} />
          {route.params.image ? (
            <AppButton
              label="Retry live analysis"
              variant="secondary"
              compact
              onPress={() => navigation.replace('Analyze', { image: route.params.image as NonNullable<typeof route.params.image> })}
            />
          ) : null}
        </View>
      ) : null}
      {storageError ? <InlineNotice title="Save issue" body={storageError} tone="error" /> : null}
      {__DEV__ && result.analysis_meta.mock ? (
        <View style={styles.demoBanner}>
          <Badge label="Development demo" tone="neutral" />
          <Text style={styles.demoBannerText}>Fixture data · not a live identification</Text>
        </View>
      ) : null}

      {displayImageUri ? (
        <Image accessibilityLabel={`Analyzed image for ${result.identification.name}`} source={{ uri: displayImageUri }} style={styles.resultImage} />
      ) : null}

      <View style={styles.identityCard}>
        <View style={styles.identityTop}>
          <CategoryMark category={result.identification.category} size={68} />
          <View style={styles.identityCopy}>
            <Text style={styles.category}>{category.label.toUpperCase()}</Text>
            <Text accessibilityRole="header" style={styles.name}>{result.identification.name}</Text>
            {result.identification.scientific_name ? <Text style={styles.scientific}>{result.identification.scientific_name}</Text> : null}
            {result.identification.brand ? <Text style={styles.brand}>{result.identification.brand}</Text> : null}
          </View>
        </View>
        <View style={styles.badgeRow}>
          <Badge label={result.status.replace('_', ' ')} tone={result.status === 'complete' ? 'green' : 'amber'} />
          <Badge label={`${result.safety.risk_level} risk`} tone={riskTone(result.safety.risk_level)} />
          {result.identification.requires_expert_verification ? <Badge label="Expert review" tone="red" /> : null}
        </View>
        <Text style={styles.timestamp}>{formatDiscoveryDate(result.created_at)} · {formatDiscoveryTime(result.created_at)}</Text>
        <View style={styles.confidence}><ConfidenceMeter confidence={result.identification.confidence} label={result.identification.confidence_label} /></View>
      </View>

      <SafetyPanel result={result} />

      <SectionTitle title="What EcoLens sees" detail="A suggestion with visible support—not proof of identity." />
      <Card>
        <Text style={styles.description}>{result.description}</Text>
        <Text style={styles.cardLabel}>VISIBLE EVIDENCE</Text>
        {result.identification.evidence.length > 0
          ? result.identification.evidence.map((evidence) => <ListItem key={evidence}>{evidence}</ListItem>)
          : <Text style={styles.missingEvidence}>No supporting visual traits were returned. Treat this match as uncertain.</Text>}
      </Card>

      <SectionTitle title="Alternatives to consider" detail="Look-alikes matter when confidence or safety is uncertain." />
      {result.identification.alternatives.length > 0 ? (
        result.identification.alternatives.map((alternative) => (
          <Card key={alternative.name} tone="soft" style={styles.alternativeCard}>
            <Text style={styles.alternativeName}>{alternative.name}</Text>
            <Text style={styles.alternativeReason}>{alternative.reason}</Text>
          </Card>
        ))
      ) : (
        <Card tone="soft"><Text style={styles.unavailableBody}>No specific alternatives were returned. This does not rule out look-alikes.</Text></Card>
      )}

      <SectionTitle title="Nutrition & provenance" detail={nutritionDetail} />
      <NutritionPanel nutrition={result.nutrition} />

      <SectionTitle title="Safe recipe ideas" detail="Available only when scan safety rules permit them." />
      {safety.shouldSuppressRecipes || suppressionReason ? (
        <Card style={styles.blockedRecipes}>
          <Badge label="Recipes blocked" tone="red" />
          <Text accessibilityRole="header" style={styles.blockedTitle}>No preparation ideas are shown for this discovery.</Text>
          <Text style={styles.blockedBody}>{suppressionReason ?? safety.action}</Text>
          <Text style={styles.blockedBody}>Cooking does not make every toxic species safe. Do not use this scan to make an edibility decision.</Text>
        </Card>
      ) : (
        <>
          <Card tone="soft" style={styles.preferenceCard}>
            <Text style={styles.preferenceTitle}>Optional preferences</Text>
            <TextInput
              accessibilityLabel="Recipe dietary preferences"
              accessibilityHint="Separate preferences with commas"
              autoCapitalize="none"
              placeholder="e.g. dairy-free, quick, low-sodium"
              placeholderTextColor={colors.inkMuted}
              value={preferences}
              onChangeText={setPreferences}
              style={styles.preferenceInput}
            />
            <AppButton
              label={recipes.length > 0 ? 'Refresh safe ideas' : 'Generate safe ideas'}
              detail="Uses this scan ID and your preferences"
              loading={recipeLoading}
              onPress={() => void requestRecipes()}
            />
          </Card>
          {recipeError ? (
            <View style={styles.recipeError}>
              <InlineNotice title="Recipe service unavailable" body={recipeError} tone="error" />
              <AppButton label="Retry recipe generation" variant="secondary" compact onPress={() => void requestRecipes()} />
            </View>
          ) : null}
          {recipes.map((recipe, index) => <RecipeCard key={`${recipe.title}-${index}`} recipe={recipe} index={index} />)}
          {recipes.length === 0 && !recipeLoading && !recipeError ? (
            <Text style={styles.noRecipes}>No recipe ideas are stored for this scan. Generate ideas only after you have independently verified the item.</Text>
          ) : null}
        </>
      )}

      <SectionTitle title="Worth knowing" />
      <Card tone="soft">
        {result.facts.length > 0
          ? result.facts.map((fact) => <ListItem key={fact}>{fact}</ListItem>)
          : <Text style={styles.unavailableBody}>No additional facts were returned.</Text>}
      </Card>

      {result.chat_available ? (
        <View style={styles.chatAction}>
          <AppButton
            label="Ask about this discovery"
            detail="Answers stay grounded in this scan"
            onPress={() => navigation.navigate('Chat', { result })}
          />
        </View>
      ) : (
        <InlineNotice title="Follow-up chat unavailable" body="Safety policy or service state has disabled chat for this discovery." />
      )}

      <Text style={styles.meta}>Analysis model {result.analysis_meta.model} · prompt {result.analysis_meta.prompt_version} · {result.analysis_meta.latency_ms} ms</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fallbackBox: { marginBottom: spacing.md },
  favorite: { color: colors.inkMuted, fontSize: 29, lineHeight: 32 },
  favoriteActive: { color: colors.coral },
  demoBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.cream, borderRadius: radii.md, padding: spacing.sm, marginBottom: spacing.md },
  demoBannerText: { ...type.small, color: colors.inkMuted, flex: 1 },
  resultImage: { width: '100%', height: 240, borderRadius: radii.lg, marginBottom: spacing.md, backgroundColor: colors.cream },
  identityCard: { backgroundColor: colors.white, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line, padding: spacing.md },
  identityTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  identityCopy: { flex: 1 },
  category: { ...type.label, color: colors.moss, fontSize: 10 },
  name: { ...type.h1, color: colors.ink, marginTop: 2 },
  scientific: { ...type.body, color: colors.inkMuted, fontStyle: 'italic', marginTop: 2 },
  brand: { ...type.small, color: colors.ink, marginTop: 2 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.md },
  timestamp: { ...type.small, color: colors.inkMuted, marginTop: spacing.sm },
  confidence: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.md, marginTop: spacing.md },
  description: { ...type.body, color: colors.ink },
  cardLabel: { ...type.label, color: colors.moss, marginTop: spacing.lg, marginBottom: spacing.xs },
  missingEvidence: { ...type.body, color: colors.coral, marginTop: spacing.sm },
  alternativeCard: { marginBottom: spacing.sm },
  alternativeName: { ...type.h3, color: colors.ink },
  alternativeReason: { ...type.body, color: colors.inkMuted, marginTop: spacing.xs },
  unavailableTitle: { ...type.h3, color: colors.ink },
  unavailableBody: { ...type.body, color: colors.inkMuted, marginTop: spacing.xs },
  provenanceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  provenance: { ...type.small, color: colors.inkMuted, flex: 1, minWidth: 160 },
  serving: { ...type.bodyStrong, color: colors.ink, marginTop: spacing.md },
  nutritionGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs, marginTop: spacing.sm },
  nutritionCell: { width: '33.333%', padding: spacing.xs },
  nutritionValue: { ...type.h3, color: colors.forest },
  nutritionLabel: { ...type.small, color: colors.inkMuted },
  provenanceNotice: { backgroundColor: colors.amberPale, borderRadius: radii.md, padding: spacing.sm, marginTop: spacing.md },
  provenanceNoticeTitle: { ...type.label, color: colors.amber, fontSize: 10 },
  provenanceNoticeBody: { ...type.small, color: colors.ink, marginTop: 3 },
  preferenceCard: { marginBottom: spacing.md },
  preferenceTitle: { ...type.bodyStrong, color: colors.ink, marginBottom: spacing.xs },
  preferenceInput: { minHeight: 50, borderRadius: radii.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, paddingHorizontal: spacing.md, ...type.body, color: colors.ink, marginBottom: spacing.sm },
  blockedRecipes: { backgroundColor: colors.coralPale, borderWidth: 2, borderColor: colors.coral },
  blockedTitle: { ...type.h2, color: '#702A20', marginTop: spacing.md },
  blockedBody: { ...type.body, color: colors.ink, marginTop: spacing.sm },
  recipeError: { marginBottom: spacing.md },
  recipeCard: { marginBottom: spacing.md },
  recipeHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  recipeNumber: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.mossPale, alignItems: 'center', justifyContent: 'center' },
  recipeNumberText: { ...type.label, color: colors.forest },
  recipeHeadingCopy: { flex: 1 },
  recipeTitle: { ...type.h2, color: colors.ink },
  recipeMeta: { ...type.small, color: colors.inkMuted, marginTop: 2, textTransform: 'capitalize' },
  recipeSection: { ...type.label, color: colors.moss, marginTop: spacing.lg },
  dietaryBox: { backgroundColor: colors.sunPale, borderRadius: radii.md, padding: spacing.sm, marginTop: spacing.md },
  dietaryTitle: { ...type.label, color: colors.amber, fontSize: 10 },
  dietaryNote: { ...type.small, color: colors.ink, marginTop: 4 },
  recipeBoundary: { ...type.small, color: colors.inkMuted, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.sm, marginTop: spacing.md },
  noRecipes: { ...type.body, color: colors.inkMuted, textAlign: 'center', marginVertical: spacing.md },
  chatAction: { marginTop: spacing.xl },
  meta: { ...type.small, color: colors.inkMuted, textAlign: 'center', marginTop: spacing.lg, fontSize: 11 },
});
